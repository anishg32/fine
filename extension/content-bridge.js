/**
 * FYZA BROWSER AGENT — CONTENT SCRIPT BRIDGE
 * Bridges validated web application requests from Fyza to the extension service worker.
 */

// Inform the Fyza web application that the extension is active
try {
  const script = document.createElement("script");
  script.textContent = "window.__FYZA_EXTENSION_ACTIVE__ = true; window.dispatchEvent(new CustomEvent('fyza_extension_detected'));";
  document.documentElement.appendChild(script);
  script.remove();
} catch {
  // Fallback
  window.__FYZA_EXTENSION_ACTIVE__ = true;
}

// Listen for messages from the Fyza web application
window.addEventListener("message", async (event) => {
  // Only accept messages from the current origin
  if (event.origin !== window.location.origin) return;

  const data = event.data;
  if (!data || typeof data !== "object") return;

  // Handle Ping
  if (data.type === "FYZA_AGENT_PING") {
    window.postMessage(
      {
        type: "FYZA_AGENT_PONG",
        source: "fyza-extension",
        version: "1.0.0",
      },
      window.location.origin
    );
    return;
  }

  // Handle Agent Request
  if (data.type === "FYZA_AGENT_REQUEST" && data.source === "fyza-web") {
    const { actionId, actionType, payload } = data;

    try {
      chrome.runtime.sendMessage(
        {
          actionId,
          actionType,
          payload,
          origin: window.location.origin,
        },
        (response) => {
          const lastError = chrome.runtime.lastError;
          if (lastError) {
            window.postMessage(
              {
                type: "FYZA_AGENT_RESPONSE",
                actionId,
                success: false,
                error: lastError.message || "Failed to communicate with extension background.",
                source: "fyza-extension",
              },
              window.location.origin
            );
            return;
          }

          window.postMessage(
            {
              type: "FYZA_AGENT_RESPONSE",
              actionId,
              success: response?.success ?? false,
              payload: response?.payload,
              error: response?.error,
              source: "fyza-extension",
            },
            window.location.origin
          );
        }
      );
    } catch (err) {
      window.postMessage(
        {
          type: "FYZA_AGENT_RESPONSE",
          actionId,
          success: false,
          error: err instanceof Error ? err.message : "Extension bridge exception.",
          source: "fyza-extension",
        },
        window.location.origin
      );
    }
  }
});
