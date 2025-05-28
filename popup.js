document.addEventListener('DOMContentLoaded', function() {
    const toggleButton = document.getElementById('toggleFilter');
    const statusDiv = document.getElementById('status');
    const filterInput = document.getElementById('filterValue');
    const applyFilterButton = document.getElementById('applyFilter');

    // Проверяем текущее состояние фильтра при открытии popup
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {action: 'get_status'}, function(response) {
            if (chrome.runtime.lastError) {
                // Если произошла ошибка (например, content script не загружен), устанавливаем неактивное состояние
                console.log('Content script not loaded or error occurred:', chrome.runtime.lastError.message);
                updateUI(false, ':proezd:');
            } else if (response) {
                // Обновляем UI в соответствии с текущим состоянием фильтра
                updateUI(response.filterActive, response.filterValue || ':proezd:');
            } else {
                // Если нет ответа, считаем фильтр неактивным
                updateUI(false, ':proezd:');
            }
        });
    });

    toggleButton.addEventListener('click', function() {
        const filterValue = filterInput.value.trim() || ':proezd:';
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: 'toggle_filter',
                filterValue: filterValue
            }, function(response) {
                if (chrome.runtime.lastError) {
                    console.log('Error toggling filter:', chrome.runtime.lastError.message);
                    alert('Ошибка: убедитесь, что вы находитесь на странице Flink Dashboard');
                } else if (response && response.status === 'success') {
                    updateUI(response.filterActive, response.filterValue);
                }
            });
        });
    });

    applyFilterButton.addEventListener('click', function() {
        const filterValue = filterInput.value.trim();
        if (!filterValue) {
            alert('Введите значение для фильтра');
            return;
        }

        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: 'apply_filter',
                filterValue: filterValue
            }, function(response) {
                if (chrome.runtime.lastError) {
                    console.log('Error applying filter:', chrome.runtime.lastError.message);
                    alert('Ошибка: убедитесь, что вы находитесь на странице Flink Dashboard');
                } else if (response && response.status === 'success') {
                    updateUI(response.filterActive, response.filterValue);
                }
            });
        });
    });

    // Обработчик Enter в поле ввода
    filterInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            applyFilterButton.click();
        }
    });

    function updateUI(isActive, filterValue) {
        filterInput.value = filterValue;

        if (isActive) {
            statusDiv.textContent = `Фильтр активен: "${filterValue}"`;
            statusDiv.className = 'status active';
            toggleButton.textContent = 'Отключить фильтр';
        } else {
            statusDiv.textContent = 'Фильтр неактивен';
            statusDiv.className = 'status inactive';
            toggleButton.textContent = 'Включить фильтр';
        }
    }
});