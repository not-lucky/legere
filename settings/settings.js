// Settings page logic
document.addEventListener('DOMContentLoaded', async () => {
  const form = document.getElementById('settings-form');
  const apiBaseUrl = document.getElementById('apiBaseUrl');
  const apiKey = document.getElementById('apiKey');
  const modelName = document.getElementById('modelName');
  const toast = document.getElementById('toast');

  // Load saved settings
  const data = await browser.storage.local.get(['apiBaseUrl', 'apiKey', 'modelName']);
  if (data.apiBaseUrl) apiBaseUrl.value = data.apiBaseUrl;
  if (data.apiKey) apiKey.value = data.apiKey;
  if (data.modelName) modelName.value = data.modelName;

  // Save settings
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const values = {
      apiBaseUrl: apiBaseUrl.value.trim(),
      apiKey: apiKey.value.trim(),
      modelName: modelName.value.trim()
    };

    // Validate
    if (!values.apiBaseUrl || !values.apiKey || !values.modelName) {
      showToast('All fields are required', 'error');
      return;
    }

    try {
      await browser.storage.local.set(values);
      showToast('Saved!', 'success');
    } catch (err) {
      showToast('Failed to save', 'error');
    }
  });

  function showToast(message, type) {
    toast.textContent = message;
    toast.className = type;
    setTimeout(() => {
      toast.className = '';
    }, 2000);
  }
});
