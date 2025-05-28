document.addEventListener('DOMContentLoaded', function() {
    const toggleButton = document.getElementById('toggleFilter');
    const statusDiv = document.getElementById('status');

    // Проверяем текущее состояние фильтра
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {action: 'get_status'}, function(response) {
            // Если нет ответа, значит контент скрипт не загружен или фильтр неактивен
            updateUI(false);
        });
    });

    toggleButton.addEventListener('click', function() {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {action: 'toggle_filter'}, function(response) {
                if (response && response.status === 'success') {
                    // Переключаем состояние UI
                    const isActive = statusDiv.classList.contains('inactive');
                    updateUI(isActive);
                }
            });
        });
    });

    function updateUI(isActive) {
        if (isActive) {
            statusDiv.textContent = 'Фильтр активен';
            statusDiv.className = 'status active';
            toggleButton.textContent = 'Отключить фильтр';
        } else {
            statusDiv.textContent = 'Фильтр неактивен';
            statusDiv.className = 'status inactive';
            toggleButton.textContent = 'Включить фильтр';
        }
    }
});