document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  checkStatuses();
  setupEventListeners();
});

function setupEventListeners() {
  const modeSelect = document.getElementById('mode-select');
  const saveSettingsBtn = document.getElementById('save-settings');
  
  if (modeSelect) {
    modeSelect.addEventListener('change', updateModeUI);
  }
  
  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', saveSettings);
  }
}

function updateModeUI() {
  const mode = document.getElementById('mode-select').value;
  const ollamaModelSetting = document.getElementById('ollama-model-setting');
  if (ollamaModelSetting) {
    ollamaModelSetting.style.display = mode === 'ollama' ? 'block' : 'none';
  }
}

function loadSettings() {
  chrome.storage.local.get(['preferenceMode', 'ollamaModel'], (result) => {
    const modeSelect = document.getElementById('mode-select');
    const modelSelect = document.getElementById('model-select');
    
    if (modeSelect && result.preferenceMode) {
      modeSelect.value = result.preferenceMode;
    }
    
    if (modelSelect && result.ollamaModel) {
      modelSelect.value = result.ollamaModel;
    }
    
    updateModeUI();
  });
}

function saveSettings() {
  const modeSelect = document.getElementById('mode-select');
  const modelSelect = document.getElementById('model-select');
  
  if (!modeSelect || !modelSelect) {
    console.error('Settings elements not found');
    return;
  }
  
  const mode = modeSelect.value;
  const model = modelSelect.value;
  
  chrome.storage.local.set({ preferenceMode: mode, ollamaModel: model }, () => {
    const btn = document.getElementById('save-settings');
    if (btn) {
      const originalText = btn.textContent;
      btn.textContent = '✓ Saved!';
      setTimeout(() => {
        btn.textContent = originalText;
      }, 2000);
    }
  });
}

async function checkStatuses() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getStatus' });
    
    if (!response) {
      throw new Error('No response from background');
    }
    
    const ollamaStatus = document.getElementById('ollama-status');
    const ollamaModels = document.getElementById('ollama-models');
    
    if (!ollamaStatus) {
      console.error('Status element not found');
      return;
    }
    
    if (response.ollamaRunning) {
      ollamaStatus.textContent = '✅ Running';
      ollamaStatus.className = 'status-badge online';
      
      if (ollamaModels && response.models && response.models.length > 0) {
        ollamaModels.style.display = 'block';
        ollamaModels.textContent = '📦 Available: ' + response.models.join(', ');
      }
    } else {
      ollamaStatus.textContent = '⊘ Not running';
      ollamaStatus.className = 'status-badge offline';
    }
  } catch (error) {
    console.error('Status check failed:', error);
    const ollamaStatus = document.getElementById('ollama-status');
    if (ollamaStatus) {
      ollamaStatus.textContent = '❌ Error';
      ollamaStatus.className = 'status-badge offline';
    }
  }
}

setInterval(checkStatuses, 5000);
