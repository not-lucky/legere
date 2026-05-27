# Dev Plan: Right-Click Translation Extension for Firefox

## Overview

A Firefox browser extension that translates selected text into English via any OpenAI-compatible API, triggered through the right-click context menu. Fully user-configurable backend.

---

## Phase 1 — Project Scaffold & Manifest

**Goal:** Establish the extension's file structure and `manifest.json`.

### Tasks

- Initialize the project directory with the following structure:

```
translation-extension/
├── manifest.json
├── background/
│   └── background.js
├── content/
│   ├── overlay.js
│   └── overlay.css
├── settings/
│   ├── settings.html
│   ├── settings.js
│   └── settings.css
└── icons/
    ├── icon-48.png
    └── icon-96.png
```

- Write `manifest.json` (Manifest V2 for Firefox):
  - `manifest_version`: 2
  - `permissions`: `contextMenus`, `storage`, `activeTab`, `clipboardWrite`
  - Register `background/background.js` as a persistent background script
  - Register `content/overlay.js` + `overlay.css` as content scripts matching `<all_urls>`
  - Point `options_ui` to `settings/settings.html`
  - Add extension icons

**Deliverable:** Loadable skeleton extension in `about:debugging`.

---

## Phase 2 — Settings Page

**Goal:** Build the configuration UI and wire it to `browser.storage.local`.

### Tasks

- **UI (`settings.html` / `settings.css`):**
  - Three labeled input fields: API Base URL, API Key (type `password`), Model Name
  - Save button + visual success/error feedback toast
  - Basic accessible, clean layout

- **Logic (`settings.js`):**
  - On page load: read from `browser.storage.local` and pre-fill all fields
  - On Save: validate that no field is empty, then write to `browser.storage.local`
  - Show inline validation errors for empty fields
  - Show "Saved!" confirmation on success

**Storage schema:**
```json
{
  "apiBaseUrl": "https://api.openai.com/v1",
  "apiKey": "sk-...",
  "modelName": "gpt-4o"
}
```

**Deliverable:** Functional settings page that persists config across browser sessions.

---

## Phase 3 — Context Menu Registration

**Goal:** Register a context menu item that only appears on text selection.

### Tasks

- In `background.js`:
  - On extension install/startup, call `browser.contextMenus.create()`:
    - `id`: `"translate-selection"`
    - `title`: `"Translate to English"`
    - `contexts`: `["selection"]`
  - Attach `browser.contextMenus.onClicked` listener:
    - Extract `info.selectionText`; abort silently if empty/null
    - Read settings from `browser.storage.local`
    - If any setting is missing → send a `SHOW_CONFIG_PROMPT` message to the active tab
    - Otherwise → send a `TRANSLATE` message with `{ text, apiBaseUrl, apiKey, modelName }` to the active tab

**Deliverable:** Context menu item visible only when text is selected; messages dispatched correctly.

---

## Phase 4 — API Integration (Background Script)

**Goal:** Handle the translation API call in the background script.

### Tasks

- In `background.js`, listen for `TRANSLATE` messages from content scripts:
  - Respond with `{ status: "loading" }` immediately (triggers loading UI)
  - Construct the fetch request:
    - URL: `${apiBaseUrl}/chat/completions`
    - Method: `POST`
    - Headers: `Authorization: Bearer ${apiKey}`, `Content-Type: application/json`
    - Body:
      ```json
      {
        "model": "<modelName>",
        "messages": [
          {
            "role": "system",
            "content": "You are a translator. Translate the user's text into English. Return only the translated text, with no explanation or commentary."
          },
          {
            "role": "user",
            "content": "<selected text>"
          }
        ]
      }
      ```
  - On success: extract `choices[0].message.content`, respond with `{ status: "success", translation }`
  - On failure: catch HTTP errors (401, 404, 5xx) and network errors, respond with `{ status: "error", message }`

**Error message mapping:**
| Condition | User-facing message |
|---|---|
| 401 Unauthorized | "Invalid API key. Check your settings." |
| 404 Not Found | "Model or endpoint not found. Check your settings." |
| Network failure | "No response from server. Check your connection." |
| Other HTTP error | "API error (HTTP `<status>`). Try again." |

**Deliverable:** Background script performs the API call and returns structured results to the content script.

---

## Phase 5 — Content Script: Overlay UI

**Goal:** Inject and manage the translation overlay on the page.

### Tasks

- **`overlay.js` — Message Listener:**
  - Listen for messages from background: `SHOW_CONFIG_PROMPT`, `TRANSLATE` response states
  - Manage overlay lifecycle: create, update, remove

- **Overlay Component (DOM-injected):**
  - Appended to `document.body`; positioned fixed, near the text selection (use `window.getSelection().getRangeAt(0).getBoundingClientRect()` to anchor position, clamped within viewport)
  - Structure:
    ```
    [ Header: "Translation"         [×] ]
    [ Body: loading spinner / text      ]
    [ Footer: [Copy] button (success)   ]
    ```

- **States to render:**

  | State | Overlay content |
  |---|---|
  | `loading` | Spinner animation + "Translating…" text |
  | `success` | Translated text + Copy button |
  | `error` | Error icon + error message string |
  | `config_missing` | "Please configure your API settings." + link to open settings |

- **Interactions:**
  - `[×]` button: removes overlay from DOM
  - `[Copy]` button: writes translation to clipboard via `navigator.clipboard.writeText()`; button label briefly changes to "Copied!" for 1.5s
  - Clicking outside the overlay: dismisses it
  - `Escape` key: dismisses it

- **`overlay.css`:**
  - Clean card style: rounded corners, subtle box shadow, white/dark background
  - z-index high enough to sit above page content
  - Smooth fade-in animation on appear

**Deliverable:** Full overlay lifecycle working end-to-end with all states rendered correctly.

---

## Phase 6 — Integration Testing

**Goal:** Validate all flows work together in a real browser.

### Test Cases

| # | Scenario | Expected result |
|---|---|---|
| 1 | Settings not configured → right-click translate | Config prompt overlay appears |
| 2 | Settings saved → right-click on selected text | Loading overlay → success with translation |
| 3 | Invalid API key (401) | Error overlay: "Invalid API key" message |
| 4 | Wrong model name (404) | Error overlay: "Model or endpoint not found" message |
| 5 | No internet | Error overlay: "No response from server" |
| 6 | Copy button clicked | Translation copied; button shows "Copied!" |
| 7 | [×] button or Escape pressed | Overlay dismissed cleanly |
| 8 | Right-click without any text selected | Context menu item absent (contexts: selection) |
| 9 | Custom local endpoint (e.g. Ollama) | Translation works with custom base URL |
| 10 | Very long selected text | Overlay scrollable; no layout breakage |

**Deliverable:** All test cases pass in Firefox Developer Edition.

---

## Phase 7 — Polish & Packaging

### Tasks

- **UX hardening:**
  - Prevent multiple overlays stacking — remove any existing overlay before creating a new one
  - Clamp overlay position so it never renders partially off-screen
  - Minimum/maximum width constraints on the overlay card

- **Security:**
  - API Key stored in `browser.storage.local` (sandboxed to extension only)
  - Never log or expose the API Key in console output

- **Packaging:**
  - Run `web-ext lint` to check for manifest and code issues
  - Run `web-ext build` to produce a `.zip` artifact ready for submission to [addons.mozilla.org](https://addons.mozilla.org)
  - Write a short `README.md` with installation instructions and configuration steps

**Deliverable:** Linted, packaged `.xpi`/`.zip` file ready for distribution.

---

## Milestones Summary

| Phase | Deliverable | Effort estimate |
|---|---|---|
| 1 — Scaffold | Loadable extension skeleton | ~1h |
| 2 — Settings Page | Persistent config UI | ~2h |
| 3 — Context Menu | Right-click menu + message routing | ~1h |
| 4 — API Integration | Background fetch + error handling | ~2–3h |
| 5 — Overlay UI | Full content script + all states | ~3–4h |
| 6 — Testing | All scenarios verified in browser | ~2h |
| 7 — Polish & Package | Linted, packaged, documented | ~1–2h |
| **Total** | | **~12–15h** |

---

## Key Technical Decisions

- **Manifest V2** — Firefox's recommended version; MV3 support on Firefox is still maturing and would complicate background script usage unnecessarily.
- **`browser.storage.local`** — Scoped to the extension, never accessible by web pages.
- **Background script does the fetch** — Avoids CORS issues that would arise from making API calls in a content script context.
- **DOM injection over browser popup** — A floating overlay anchored near the selection gives better UX than a fixed sidebar popup for a translate-in-context workflow.
