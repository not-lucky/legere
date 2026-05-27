// Content script for translation overlay

let currentOverlay = null;

// Remove existing overlay
function removeOverlay() {
  if (currentOverlay) {
    currentOverlay.remove();
    currentOverlay = null;
  }
}

// Get selection position
function getSelectionPosition() {
  const sel = window.getSelection();
  if (!sel.rangeCount) return null;
  const rect = sel.getRangeAt(0).getBoundingClientRect();
  return {
    x: Math.min(rect.left + rect.width / 2, window.innerWidth - 200),
    y: Math.min(rect.bottom + 8, window.innerHeight - 100)
  };
}

// Create overlay
function createOverlay(state, data = {}) {
  removeOverlay();

  const pos = getSelectionPosition() || { x: 100, y: 100 };
  const overlay = document.createElement('div');
  overlay.className = 'translate-overlay';
  overlay.style.left = `${pos.x}px`;
  overlay.style.top = `${pos.y}px`;

  // Header
  const header = document.createElement('div');
  header.className = 'translate-header';
  const title = document.createElement('span');
  title.textContent = 'Translation';
  const closeBtn = document.createElement('button');
  closeBtn.className = 'translate-close';
  closeBtn.textContent = '×';
  header.appendChild(title);
  header.appendChild(closeBtn);
  overlay.appendChild(header);

  // Body
  const body = document.createElement('div');
  body.className = 'translate-body';

  if (state === 'loading') {
    const spinner = document.createElement('div');
    spinner.className = 'translate-spinner';
    const text = document.createElement('span');
    text.textContent = 'Translating…';
    body.appendChild(spinner);
    body.appendChild(text);
  } else if (state === 'success') {
    const text = document.createElement('div');
    text.className = 'translate-text';
    text.textContent = data.translation;
    body.appendChild(text);
  } else if (state === 'error') {
    const text = document.createElement('div');
    text.className = 'translate-error';
    text.textContent = '⚠️ ' + data.message;
    body.appendChild(text);
  } else if (state === 'config_missing') {
    const text = document.createElement('div');
    text.className = 'translate-config';
    text.textContent = 'Please configure your API settings. ';
    const link = document.createElement('a');
    link.href = '#';
    link.id = 'open-settings';
    link.textContent = 'Open settings';
    text.appendChild(link);
    body.appendChild(text);
  }

  overlay.appendChild(body);

  // Footer (success only)
  if (state === 'success') {
    const footer = document.createElement('div');
    footer.className = 'translate-footer';
    const copyBtn = document.createElement('button');
    copyBtn.className = 'translate-copy';
    copyBtn.textContent = 'Copy';
    footer.appendChild(copyBtn);
    overlay.appendChild(footer);
  }

  document.body.appendChild(overlay);
  currentOverlay = overlay;

  // Close button
  closeBtn.onclick = removeOverlay;

  // Copy button
  const copyBtn = overlay.querySelector('.translate-copy');
  if (copyBtn) {
    copyBtn.onclick = async () => {
      await navigator.clipboard.writeText(data.translation);
      copyBtn.textContent = 'Copied!';
      setTimeout(() => copyBtn.textContent = 'Copy', 1500);
    };
  }

  // Settings link
  const settingsLink = overlay.querySelector('#open-settings');
  if (settingsLink) {
    settingsLink.onclick = (e) => {
      e.preventDefault();
      browser.runtime.sendMessage({ type: 'OPEN_SETTINGS' });
      removeOverlay();
    };
  }

  // Click outside to close
  setTimeout(() => {
    document.addEventListener('click', handleOutsideClick, { once: true });
  }, 0);

  // Escape to close
  document.addEventListener('keydown', handleEscape);
}

function handleOutsideClick(e) {
  if (currentOverlay && !currentOverlay.contains(e.target)) {
    removeOverlay();
  }
}

function handleEscape(e) {
  if (e.key === 'Escape' && currentOverlay) {
    removeOverlay();
    document.removeEventListener('keydown', handleEscape);
  }
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Listen for messages from background
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SHOW_CONFIG_PROMPT') {
    createOverlay('config_missing');
    return;
  }

  if (message.type === 'TRANSLATE') {
    createOverlay('loading');
    browser.runtime.sendMessage(message).then(response => {
      if (response.status === 'success') {
        createOverlay('success', { translation: response.translation });
      } else if (response.status === 'error') {
        createOverlay('error', { message: response.message });
      }
    });
    return;
  }
});
