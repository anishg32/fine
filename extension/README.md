# Fyza Browser Control Companion Extension

This is the authorized companion Chrome extension (Manifest V3) for the Fyza AI Assistant. It allows Fyza to assist with external website actions (such as opening approved destinations, reading authorized page summaries, or finding text) with explicit user approval.

---

## Architecture & Security Model

1. **Explicit Confirmation**: The extension cannot perform any action without explicit user approval inside the Fyza chat interface.
2. **Origin-Restricted Bridge**: The content script only accepts messages from `http://localhost:3000` (or `https://*.fyza.finance`).
3. **Strict Allowlist**: Only predetermined actions (`open_authorized_external_url`, `read_page_content`, `find_visible_text`, `fill_permitted_form`, `click_permitted_element`) are accepted.
4. **Zero Eval / Sandboxing**: Manifest V3 blocks `eval()` and inline execution. Content scripts extract visible DOM text only.
5. **Prompt Injection Shield**: Page text is sanitized and capped at 4,000 characters before being processed.

---

## How to Load the Extension in Chrome / Edge / Brave

1. Open **Google Chrome** (or Edge/Brave/Arc).
2. Navigate to `chrome://extensions/` in the address bar.
3. Toggle on **"Developer mode"** in the top-right corner.
4. Click **"Load unpacked"** in the top-left toolbar.
5. Select the `extension/` directory inside your `fine wise` project folder:
   `/Users/anishg/Desktop/fine wise/extension`
6. The extension **"Fyza Browser Control Agent"** will appear in your extensions list.
7. Return to `http://localhost:3000/app/ai-assistant`. The header will immediately show:
   `🟢 Browser Agent: Connected`

---

## Supported Commands from Fyza AI

- *"Open github.com"* → Generates action, requests approval, opens tab upon confirmation.
- *"Summarize this page"* → Reads the currently authorized tab and returns a clean summary.
- *"Find pricing on this page"* → Scans visible text for occurrences.
