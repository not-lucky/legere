// Background script for translation extension

// Create context menu on install/startup
browser.runtime.onInstalled.addListener(() => {
  browser.contextMenus.create({
    id: 'translate-selection',
    title: 'Translate to English',
    contexts: ['selection']
  });
});

// Handle context menu click
browser.contextMenus.onClicked.addListener(async (info, tab) => {
  const text = info.selectionText;
  if (!text) return;

  const settings = await browser.storage.local.get(['apiBaseUrl', 'apiKey', 'modelName']);

  if (!settings.apiBaseUrl || !settings.apiKey || !settings.modelName) {
    browser.tabs.sendMessage(tab.id, { type: 'SHOW_CONFIG_PROMPT' });
    return;
  }

  browser.tabs.sendMessage(tab.id, {
    type: 'TRANSLATE',
    text,
    apiBaseUrl: settings.apiBaseUrl,
    apiKey: settings.apiKey,
    modelName: settings.modelName
  });
});

// Handle messages from content scripts
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'OPEN_SETTINGS') {
    browser.runtime.openOptionsPage();
    return;
  }

  if (message.type !== 'TRANSLATE') return;

  const { text, apiBaseUrl, apiKey, modelName } = message;

  fetch(`${apiBaseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: modelName,
      messages: [
        {
          role: 'system',
          content: 'You are a translator. Translate the user\'s text into English. Return only the translated text, with no explanation or commentary.'
        },
        { role: 'user', content: text }
      ]
    })
  })
    .then(async res => {
      if (!res.ok) {
        if (res.status === 401) throw new Error('Invalid API key. Check your settings.');
        if (res.status === 404) throw new Error('Model or endpoint not found. Check your settings.');
        throw new Error(`API error (HTTP ${res.status}). Try again.`);
      }
      const data = await res.json();
      const translation = data.choices?.[0]?.message?.content;
      if (!translation) throw new Error('No translation returned.');
      sendResponse({ status: 'success', translation });
    })
    .catch(err => {
      let message = err.message;
      if (err.name === 'TypeError' || message.includes('fetch') || message.includes('Network')) {
        message = 'No response from server. Check your connection.';
      }
      sendResponse({ status: 'error', message });
    });

  return true; // Keep channel open for async response
});
