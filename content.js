let proezdJobSorted = false;

// Проверяем, является ли страница Apache Flink Dashboard
function isFlinkDashboard() {
  return document.title.includes('Flink') || 
         document.querySelector('[class*="flink"]') || 
         document.querySelector('table') && window.location.href.includes('8081');
}

// Функция для фильтрации таблицы
function filterProezdJobs() {
  // Ищем все таблицы на странице
  const tables = document.querySelectorAll('table');

  tables.forEach(table => {
    const rows = table.querySelectorAll('tr');

    // Находим заголовок таблицы для определения колонки с именем job и индекс
    let jobNameColumnIndex = -1;
    let jobNameHeader = null;
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
        shouldShow = jobName.includes(':proezd:');
      } else {
        // Если не нашли колонку, ищем по всем ячейкам
        cells.forEach(cell => {
          if (cell.textContent.includes(':proezd:')) {
            shouldShow = true;
          }
        });
      }

      // Скрываем или показываем строку
      if (shouldShow) {
        row.style.display = '';
        row.classList.add('proezd-filtered');
      } else {
        row.style.display = 'none';
        row.classList.add('proezd-hidden');
      }
    });

    // <<< ДОБАВЛЕНО: клик по заголовку для сортировки >>>
    if (jobNameHeader && !proezdJobSorted) {
      // эмулируем клик только один раз
      setTimeout(() => {
        jobNameHeader.click();
        proezdJobSorted = true;
      }, 0);
    }
  });

  // Добавляем индикатор фильтрации
  addFilterIndicator();
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
      🔍 Фильтр :proezd: активен
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
    
    if (shouldRefilter && document.getElementById('proezd-filter-indicator')) {
      setTimeout(filterProezdJobs, 100); // Небольшая задержка для завершения загрузки
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Основная функция инициализации
function init() {
  if (isFlinkDashboard()) {
    // Ждем полной загрузки страницы
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(filterProezdJobs, 500);
        observeChanges();
      });
    } else {
      setTimeout(filterProezdJobs, 500);
      observeChanges();
    }
  }
}

// Запускаем плагин
init();

// Слушаем сообщения от popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'toggle_filter') {
    const indicator = document.getElementById('proezd-filter-indicator');
    if (indicator) {
      clearFilter();
    } else {
      filterProezdJobs();
    }
    sendResponse({status: 'success'});
  }
});