document.addEventListener('DOMContentLoaded', function() {
    const toggleButton = document.getElementById('toggleFilter');
    const statusDiv = document.getElementById('status');

    // Проверяем текущее состояние фильтра при открытии popup
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {action: 'get_status'}, function(response) {
            if (chrome.runtime.lastError) {
                // Если произошла ошибка (например, content script не загружен), устанавливаем неактивное состояние
                console.log('Content script not loaded or error occurred:', chrome.runtime.lastError.message);
                updateUI(false);
            } else if (response) {
                // Обновляем UI в соответствии с текущим состоянием фильтра
                updateUI(response.filterActive);
            } else {
                // Если нет ответа, считаем фильтр неактивным
                updateUI(false);
            }
        });
    });

    toggleButton.addEventListener('click', function() {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {action: 'toggle_filter'}, function(response) {
                if (chrome.runtime.lastError) {
                    console.log('Error toggling filter:', chrome.runtime.lastError.message);
                    // Можно показать пользователю сообщение об ошибке
                    alert('Ошибка: убедитесь, что вы находитесь на странице Flink Dashboard');
                } else if (response && response.status === 'success') {
                    // Обновляем UI в соответствии с новым состоянием
                    updateUI(response.filterActive);
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