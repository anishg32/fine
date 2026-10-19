/**
 * FYZA BROWSER AGENT — POPUP LOGIC
 */

document.addEventListener("DOMContentLoaded", async () => {
  const tabUrlEl = document.getElementById("tab-url");
  const bridgeStatusEl = document.getElementById("bridge-status");
  const pauseBtn = document.getElementById("pause-btn");

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url) {
      try {
        const u = new URL(tab.url);
        tabUrlEl.textContent = u.hostname;
      } catch {
        tabUrlEl.textContent = tab.url;
      }
    } else {
      tabUrlEl.textContent = "None";
    }
  } catch {
    tabUrlEl.textContent = "Inactive";
  }

  pauseBtn.addEventListener("click", () => {
    bridgeStatusEl.textContent = "Paused ⏸️";
    bridgeStatusEl.style.color = "#FF5A79";
    pauseBtn.textContent = "Permissions Revoked";
    pauseBtn.disabled = true;
  });
});
