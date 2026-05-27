# Translate to English

A Firefox browser extension that translates selected text into English via any OpenAI-compatible API, triggered through the right-click context menu.

## Building

Requires Node.js and npm. Install web-ext:

```bash
npm install -g web-ext
```

Build the extension:

```bash
web-ext build
```

The packaged extension will be in `web-ext-artifacts/translate_to_english-1.0.zip`.

## Installation

1. Download or clone this repository
2. Open Firefox and navigate to `about:debugging`
3. Click "This Firefox" in the sidebar
4. Click "Load Temporary Add-on"
5. Select the `manifest.json` file from this directory

## Configuration

1. Right-click the extension icon and select "Options", or:
   - Select any text on a webpage
   - Right-click and choose "Translate to English"
   - Click "Open settings" in the prompt
2. Fill in the required fields:
   - **API Base URL**: Your OpenAI-compatible API endpoint (e.g., `https://api.openai.com/v1`)
   - **API Key**: Your API key
   - **Model Name**: The model to use (e.g., `gpt-4o`)
3. Click "Save"

## Usage

1. Select text on any webpage
2. Right-click and choose "Translate to English"
3. A translation overlay will appear near your selection
4. Click "Copy" to copy the translation to clipboard
5. Press Escape or click outside to dismiss

## Custom Endpoints

This extension works with any OpenAI-compatible API, including:
- OpenAI
- Azure OpenAI
- Ollama (set base URL to `http://localhost:11434/v1`)
- LocalAI
- Any other compatible endpoint

## Privacy

- API keys are stored in `browser.storage.local`, sandboxed to this extension
- No data is sent anywhere except your configured API endpoint
- No telemetry or tracking
