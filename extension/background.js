/**
 * FYZA BROWSER AGENT — BACKGROUND SERVICE WORKER (Manifest V3)
 * Handles tab creation, authorized content extraction, and browser actions safely.
 */

// Allowlisted action types
const ALLOWED_EXTENSION_ACTIONS = [
  "open_authorized_external_url",
  "read_page_content",
  "summarize_authorized_page",
  "find_visible_text",
  "fill_permitted_form",
  "click_permitted_element",
];

// Block dangerous protocols and private network ranges
const BLOCKED_PROTOCOLS = ["javascript:", "data:", "file:", "chrome:", "about:", "vbscript:"];
const BLOCKED_HOST_PATTERNS = [
  /^169\.254\./,
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^192\.168\./,
  /^0\.0\.0\.0/,
];

function validateUrl(rawUrl) {
  try {
    let clean = (rawUrl || "").trim();
    const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(clean);
    if (!hasScheme) {
      clean = "https://" + clean;
    }
    const parsed = new URL(clean);
    if (BLOCKED_PROTOCOLS.some((p) => parsed.protocol.toLowerCase() === p)) {
      return { valid: false, error: "Disallowed URL protocol." };
    }
    if (parsed.protocol !== "https:" && !parsed.hostname.includes("localhost")) {
      return { valid: false, error: "Only secure HTTPS URLs are authorized." };
    }
    const host = parsed.hostname.toLowerCase();
    if (BLOCKED_HOST_PATTERNS.some((p) => p.test(host))) {
      return { valid: false, error: "Access to private network infrastructure is blocked." };
    }
    return { valid: true, url: parsed.toString() };
  } catch {
    return { valid: false, error: "Malformed URL provided." };
  }
}

// Prompt Injection Sanitizer for webpage text
function sanitizePageText(text) {
  if (!text || typeof text !== "string") return "";
  return text
    .slice(0, 4000) // Cap at 4,000 characters to prevent memory/token overflows
    .replace(/ignore\s+(all\s+)?(previous|prior)\s+instructions/gi, "[filtered]")
    .replace(/system\s*:\s*you\s+are\s+now/gi, "[filtered]")
    .replace(/reveal\s+(system|developer|hidden)\s+(prompt|instructions|keys)/gi, "[filtered]")
    .trim();
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const { actionType, payload } = request;

  if (!ALLOWED_EXTENSION_ACTIONS.includes(actionType)) {
    sendResponse({ success: false, error: `Unauthorized action type: ${actionType}` });
    return false;
  }

  handleAction(actionType, payload)
    .then((result) => sendResponse(result))
    .catch((err) => sendResponse({ success: false, error: err.message || "Action failed." }));

  return true; // Keep channel open for async response
});

async function handleAction(actionType, payload = {}) {
  switch (actionType) {
    // --- 1. Open Authorized Tab ---
    case "open_authorized_external_url": {
      const check = validateUrl(payload.url);
      if (!check.valid || !check.url) {
        return { success: false, error: check.error || "Invalid URL destination." };
      }

      const tab = await chrome.tabs.create({ url: check.url, active: true });
      return {
        success: true,
        payload: {
          tabId: tab.id,
          url: check.url,
          result: `Opened tab for ${check.url}`,
        },
      };
    }

    // --- 2. Read Active Page Content ---
    case "read_page_content":
    case "summarize_authorized_page": {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!activeTab || !activeTab.id) {
        return { success: false, error: "No active tab found to read." };
      }

      const results = await chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        func: () => {
          // Extract visible document title and sanitized body text
          const title = document.title || "";
          const bodyText = document.body ? document.body.innerText : "";
          return { title, bodyText };
        },
      });

      const extracted = results?.[0]?.result;
      if (!extracted) {
        return { success: false, error: "Unable to extract text from page." };
      }

      const cleanText = sanitizePageText(extracted.bodyText);
      const summary = cleanText.length > 500 ? cleanText.slice(0, 500) + "..." : cleanText;

      return {
        success: true,
        payload: {
          title: extracted.title,
          summary: `Page Title: "${extracted.title}"\n\nContent Excerpt:\n${summary}`,
          contentLength: cleanText.length,
          result: `Successfully read authorized page: "${extracted.title}" (${cleanText.length} characters).`,
        },
      };
    }

    // --- 3. Find Visible Text ---
    case "find_visible_text": {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!activeTab || !activeTab.id) {
        return { success: false, error: "No active tab found." };
      }

      const query = (payload.query || "").toLowerCase();
      if (!query) {
        return { success: false, error: "Search query is required." };
      }

      const results = await chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        args: [query],
        func: (searchStr) => {
          const body = document.body ? document.body.innerText.toLowerCase() : "";
          const occurrences = (body.match(new RegExp(searchStr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length;
          return { occurrences };
        },
      });

      const count = results?.[0]?.result?.occurrences || 0;
      return {
        success: true,
        payload: {
          query,
          occurrences: count,
          result: `Found ${count} occurrences of "${query}" on the current page.`,
        },
      };
    }

    // --- 4. Fill Permitted Form ---
    case "fill_permitted_form": {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!activeTab || !activeTab.id) {
        return { success: false, error: "No active tab found." };
      }

      const selector = payload.selector || "input[type='text'], input[type='search']";
      const value = String(payload.value || "");

      const results = await chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        args: [selector, value],
        func: (sel, val) => {
          const el = document.querySelector(sel);
          if (!el) return { filled: false, error: `Element matching "${sel}" not found.` };
          el.value = val;
          el.dispatchEvent(new Event("input", { bubbles: true }));
          el.dispatchEvent(new Event("change", { bubbles: true }));
          return { filled: true };
        },
      });

      const res = results?.[0]?.result;
      if (!res?.filled) {
        return { success: false, error: res?.error || "Failed to fill form element." };
      }

      return {
        success: true,
        payload: { result: `Filled element "${selector}" with specified text.` },
      };
    }

    // --- 5. Click Permitted Element ---
    case "click_permitted_element": {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!activeTab || !activeTab.id) {
        return { success: false, error: "No active tab found." };
      }

      const selector = payload.selector || "button, a";
      const results = await chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        args: [selector],
        func: (sel) => {
          const el = document.querySelector(sel);
          if (!el) return { clicked: false, error: `Element matching "${sel}" not found.` };
          el.click();
          return { clicked: true };
        },
      });

      const res = results?.[0]?.result;
      if (!res?.clicked) {
        return { success: false, error: res?.error || "Failed to click element." };
      }

      return {
        success: true,
        payload: { result: `Clicked element "${selector}".` },
      };
    }

    default:
      return { success: false, error: `Unhandled action: ${actionType}` };
  }
}
