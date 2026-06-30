document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  checkStatuses();
  setupEventListeners();
});

function setupEventListeners() {
  document.getElementById('mode-select').addEventListener('change', updateModeUI);
  document.getElementById('save-settings').addEventListener('click', saveSettings);
}

function updateModeUI() {
  const mode = document.getElementById('mode-select').value;
  const ollamaModelSetting = document.getElementById('ollama-model-setting');
  ollamaModelSetting.style.display = mode === 'ollama' ? 'block' : 'none';
}

function loadSettings() {
  chrome.storage.local.get(['preferenceMode', 'ollamaModel'], (result) => {
    if (result.preferenceMode) {
      document.getElementById('mode-select').value = result.preferenceMode;
    }
    if (result.ollamaModel) {
      document.getElementById('model-select').value = result.ollamaModel;
    }
    updateModeUI();
  });
}

function saveSettings() {
  const mode = document.getElementById('mode-select').value;
  const model = document.getElementById('model-select').value;
  chrome.storage.local.set({ preferenceMode: mode, ollamaModel: model }, () => {
    const btn = document.getElementById('save-settings');
    const originalText = btn.textContent;
    btn.textContent = '✓ Saved!';
    setTimeout(() => {
      btn.textContent = originalText;
    }, 2000);
  });
}

async function checkStatuses() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getStatus' });
    const ollamaStatus = document.getElementById('ollama-status');
    const ollamaModels = document.getElementById('ollama-models');
    
    if (response.ollamaRunning) {
      ollamaStatus.textContent = '✅ Running';
      ollamaStatus.className = 'status-badge online';
      if (response.models && response.models.length > 0) {
        ollamaModels.style.display = 'block';
        ollamaModels.textContent = '📦 Available: ' + response.models.join(', ');
      }
    } else {
      ollamaStatus.textContent = '⊘ Not running';
      ollamaStatus.className = 'status-badge offline';
    }
  } catch (error) {
    console.error('Status check failed:', error);
  }
}

setInterval(checkStatuses, 5000);
