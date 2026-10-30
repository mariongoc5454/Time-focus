// Popup Script for FocusQuest Extension

document.addEventListener('DOMContentLoaded', async () => {
  const connBadge = document.getElementById('conn-badge');
  const connText = document.getElementById('conn-text');
  const sessionBadge = document.getElementById('session-badge');
  const sessionText = document.getElementById('session-text');
  const tokenInput = document.getElementById('token-input');
  const urlInput = document.getElementById('url-input');
  const saveBtn = document.getElementById('save-btn');
  const checkBtn = document.getElementById('check-btn');

  // Load saved settings
  chrome.storage.local.get(
    ['secretToken', 'serverUrl', 'isConnected', 'sessionStatus', 'isStudying'],
    (data) => {
      if (data.secretToken) tokenInput.value = data.secretToken;
      if (data.serverUrl) urlInput.value = data.serverUrl;
      updateUI(data.isConnected, data.sessionStatus, data.isStudying);
    }
  );

  function updateUI(connected, status, studying) {
    if (connected) {
      connBadge.className = 'badge connected';
      connText.textContent = 'Đã kết nối';
    } else {
      connBadge.className = 'badge disconnected';
      connText.textContent = 'Mất kết nối';
    }

    if (status === 'studying' || studying) {
      sessionBadge.className = 'badge studying';
      sessionText.textContent = 'Đang học';
    } else if (status === 'paused') {
      sessionBadge.className = 'badge paused';
      sessionText.textContent = 'Tạm dừng';
    } else {
      sessionBadge.className = 'badge';
      sessionText.textContent = 'Chưa bắt đầu';
    }
  }

  // Save settings
  saveBtn.addEventListener('click', () => {
    const secretToken = tokenInput.value.trim() || 'focusquest_default_token';
    const serverUrl = urlInput.value.trim() || 'http://127.0.0.1:48123';

    chrome.storage.local.set({ secretToken, serverUrl }, () => {
      chrome.runtime.sendMessage({ type: 'SETTINGS_UPDATED' });
      saveBtn.textContent = 'Đã lưu!';
      setTimeout(() => {
        saveBtn.textContent = 'Lưu Cấu Hình';
      }, 1500);
      pingServer();
    });
  });

  // Check connection immediately
  function pingServer() {
    checkBtn.textContent = 'Đang kiểm tra...';
    chrome.runtime.sendMessage({ type: 'PING' }, (response) => {
      checkBtn.textContent = 'Kiểm Tra Kết Nối';
      if (response) {
        updateUI(response.isConnected, response.sessionStatus, response.isStudying);
      }
    });
  }

  checkBtn.addEventListener('click', pingServer);
});
