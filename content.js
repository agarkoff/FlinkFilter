let proezdJobSorted = false;
let filterActive = false; // Добавляем переменную для отслеживания состояния фильтра
let currentFilterValue = ':proezd:'; // Добавляем переменную для хранения текущего значения фильтра

// Загружаем сохраненные настройки из storage
async function loadSettings() {
  try {
    const result = await chrome.storage.local.get(['filterValue', 'filterActive']);
    if (result.filterValue) {
      currentFilterValue = result.filterValue;
    }
    if (result.filterActive !== undefined) {
      filterActive = result.filterActive;
    }
  } catch (error) {
    console.log('Error loading settings:', error);
  }
}

// Сохраняем настройки в storage
async function saveSettings() {
  try {
    await chrome.storage.local.set({
      filterValue: currentFilterValue,
      filterActive: filterActive
    });
  } catch (error) {
    console.log('Error saving settings:', error);
  }
}

// Проверяем, является ли страница Apache Flink Dashboard
function isFlinkDashboard() {
  return window.location.href.endsWith('/#/job/running');
}

// Функция для фильтрации таблицы
function filterProezdJobs(filterValue = currentFilterValue) {
  // Обновляем текущее значение фильтра
  currentFilterValue = filterValue;

  // Ищем все таблицы на странице
  const tables = document.querySelectorAll('table');
  let totalVisibleRows = 0;
  let totalRows = 0;

  tables.forEach(table => {
    const rows = table.querySelectorAll('tr');

    // Находим заголовок таблицы для определения колонки с именем job и индекс
    let jobNameColumnIndex = -1;
    let jobNameHeader = null;
    let visibleRowsInTable = 0;
    const headerRow = rows[0];

    if (headerRow) {
      const headers = headerRow.querySelectorAll('th, td');
      headers.forEach((header, index) => {
        const headerText = header.textContent.toLowerCase();
        if (headerText.includes('job') && (headerText.includes('name') || headerText.includes('название'))) {
          jobNameColumnIndex = index;
          jobNameHeader = header; // Сохраняем ссылку на <th>/<td>
        }
      });
    }

    // Если не нашли колонку по заголовку, пробуем угадать по содержимому
    if (jobNameColumnIndex === -1 && rows.length > 1) {
      const firstDataRow = rows[1];
      if (firstDataRow) {
        const cells = firstDataRow.querySelectorAll('td');
        cells.forEach((cell, index) => {
          const cellText = cell.textContent;
          // Ищем ячейку, которая может содержать имя job (содержит точки, двоеточия)
          if (cellText.includes(':') || cellText.includes('.')) {
            jobNameColumnIndex = index;
            return;
            // Не можем получить header, если его нет, пропускаем сортировку далее
          }
        });
      }
    }

    // Фильтруем строки
    rows.forEach((row, rowIndex) => {
      if (rowIndex === 0) return; // Пропускаем заголовок

      const cells = row.querySelectorAll('td');
      let shouldShow = false;

      if (jobNameColumnIndex >= 0 && cells[jobNameColumnIndex]) {
        // Проверяем конкретную колонку
        const jobName = cells[jobNameColumnIndex].textContent;
        shouldShow = jobName.includes(currentFilterValue);
      } else {
        // Если не нашли колонку, ищем по всем ячейкам
        cells.forEach(cell => {
          if (cell.textContent.includes(currentFilterValue)) {
            shouldShow = true;
          }
        });
      }

      // Скрываем или показываем строку
      if (shouldShow) {
        row.style.display = '';
        row.classList.add('proezd-filtered');
        visibleRowsInTable++;
      } else {
        row.style.display = 'none';
        row.classList.add('proezd-hidden');
      }
    });

    // Подсчитываем общее количество строк (исключая заголовок)
    const dataRowsCount = rows.length > 0 ? rows.length - 1 : 0;
    totalRows += dataRowsCount;
    totalVisibleRows += visibleRowsInTable;

    // <<< ДОБАВЛЕНО: клик по заголовку для сортировки >>>
    if (jobNameHeader && !proezdJobSorted) {
      // эмулируем клик только один раз
      setTimeout(() => {
        jobNameHeader.click();
        proezdJobSorted = true;
      }, 0);
    }
  });

  // Устанавливаем состояние фильтра как активное
  filterActive = true;
  // Сохраняем настройки
  saveSettings();
  // Добавляем индикатор фильтрации
  addFilterIndicator();
  // Обновляем заголовки таблиц с информацией о фильтрации
  updateTableHeaders(totalVisibleRows, totalRows);
}

// Функция для обновления заголовков таблиц с информацией о фильтрации
function updateTableHeaders(visibleCount, totalCount) {

  // Также попробуем найти заголовки по более специфичным селекторам Flink UI
  const flinkHeaders = document.querySelectorAll('[class*="header"], [class*="title"], .ant-typography');
  flinkHeaders.forEach(header => {
    const headerText = header.textContent.toLowerCase();
    if ((headerText.includes('running jobs') && !header.querySelector('.proezd-filter-info'))) {

      const filterInfo = document.createElement('span');
      filterInfo.className = 'proezd-filter-info';
      filterInfo.style.cssText = `
        font-size: 0.8em;
        color: #4CAF50;
        font-weight: normal;
        margin-left: 10px;
        background: #e8f5e8;
        padding: 2px 8px;
        border-radius: 12px;
        border: 1px solid #4CAF50;
      `;
      filterInfo.textContent = `(показано: ${visibleCount} из ${totalCount})`;

      header.appendChild(filterInfo);
    }
  });
}

// Функция для удаления информации о фильтрации из заголовков
function removeFilterInfoFromHeaders() {
  const filterInfoElements = document.querySelectorAll('.proezd-filter-info');
  filterInfoElements.forEach(element => element.remove());
}

// Добавляем индикатор того, что фильтр активен
function addFilterIndicator() {
  if (document.getElementById('proezd-filter-indicator')) return;

  const indicator = document.createElement('div');
  indicator.id = 'proezd-filter-indicator';
  indicator.innerHTML = `
    <div style="
      position: fixed;
      bottom: 10px;
      left: 10px;
      background: #4CAF50;
      color: white;
      padding: 10px 15px;
      border-radius: 5px;
      z-index: 10000;
      font-family: Arial, sans-serif;
      font-size: 14px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    ">
      🔍 Фильтр "${currentFilterValue}" активен
      <button id="clear-proezd-filter" style="
        margin-left: 10px;
        background: #45a049;
        border: none;
        color: white;
        padding: 2px 8px;
        border-radius: 3px;
        cursor: pointer;
      ">Сбросить</button>
    </div>
  `;

  document.body.appendChild(indicator);

  // Добавляем обработчик для кнопки сброса
  document.getElementById('clear-proezd-filter').addEventListener('click', clearFilter);
}

// Функция для сброса фильтра
function clearFilter() {
  const tables = document.querySelectorAll('table');
  tables.forEach(table => {
    const rows = table.querySelectorAll('tr');
    rows.forEach(row => {
      row.style.display = '';
      row.classList.remove('proezd-filtered', 'proezd-hidden');
    });
  });

  const indicator = document.getElementById('proezd-filter-indicator');
  if (indicator) {
    indicator.remove();
  }

  // Удаляем информацию о фильтрации из заголовков
  removeFilterInfoFromHeaders();

  // Устанавливаем состояние фильтра как неактивное
  filterActive = false;
  // Сохраняем настройки
  saveSettings();
}

// Функция для отслеживания изменений в DOM
function observeChanges() {
  const observer = new MutationObserver((mutations) => {
    let shouldRefilter = false;

    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        // Проверяем, добавились ли новые таблицы или строки
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.tagName === 'TABLE' || node.querySelector('table') ||
                node.tagName === 'TR' || node.querySelector('tr')) {
              shouldRefilter = true;
            }
          }
        });
      }
    });

    if (shouldRefilter && filterActive) {
      setTimeout(() => {
        // Удаляем старую информацию о фильтрации из заголовков перед повторной фильтрацией
        removeFilterInfoFromHeaders();
        filterProezdJobs(currentFilterValue);
      }, 100); // Небольшая задержка для завершения загрузки
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Основная функция инициализации
async function init() {
  if (isFlinkDashboard()) {
    // Загружаем сохраненные настройки
    await loadSettings();

    // Ждем полной загрузки страницы
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
          // Если фильтр был активен, применяем его
          if (filterActive) {
            filterProezdJobs(currentFilterValue);
          }
        }, 500);
        observeChanges();
      });
    } else {
      setTimeout(() => {
        // Если фильтр был активен, применяем его
        if (filterActive) {
          filterProezdJobs(currentFilterValue);
        }
      }, 500);
      observeChanges();
    }
  }
}

// Запускаем плагин
init();

// Слушаем сообщения от popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'toggle_filter') {
    const filterValue = request.filterValue || currentFilterValue;
    const indicator = document.getElementById('proezd-filter-indicator');
    if (indicator) {
      clearFilter();
    } else {
      filterProezdJobs(filterValue);
    }
    sendResponse({status: 'success', filterActive: filterActive, filterValue: currentFilterValue});
  }
  // Добавляем обработчик для получения статуса фильтра
  else if (request.action === 'get_status') {
    sendResponse({filterActive: filterActive, filterValue: currentFilterValue});
  }
  // Добавляем обработчик для применения нового фильтра
  else if (request.action === 'apply_filter') {
    const filterValue = request.filterValue;
    if (filterValue) {
      // Сначала очищаем старый фильтр если он был активен
      if (filterActive) {
        clearFilter();
      }
      // Применяем новый фильтр
      filterProezdJobs(filterValue);
      sendResponse({status: 'success', filterActive: filterActive, filterValue: currentFilterValue});
    } else {
      sendResponse({status: 'error', message: 'Filter value is required'});
    }
  }
});