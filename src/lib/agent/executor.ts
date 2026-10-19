/**
 * FYZA AI WEBSITE CONTROL AGENT — CLIENT EXECUTION ENGINE
 * Safely dispatches allowlisted actions across Fyza and the browser companion extension.
 */

import type { AgentAction, ExtensionBridgeMessage } from "./types";
import { ALLOWED_INTERNAL_ROUTES, ALLOWED_THEMES } from "./registry";

export class AgentExecutor {
  /**
   * Check if the Fyza Browser Control Extension is present in the browser
   */
  public static isExtensionInstalled(): boolean {
    if (typeof window === "undefined") return false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return Boolean((window as any).__FYZA_EXTENSION_ACTIVE__);
  }

  /**
   * Execute an approved action through safe, typed handlers
   */
  public static async executeAction(
    action: AgentAction,
    navigateCallback?: (path: string) => void
  ): Promise<{ success: boolean; result?: string; error?: string }> {
    if (typeof window === "undefined") {
      return { success: false, error: "Cannot execute action outside a browser context." };
    }

    try {
      switch (action.type) {
        // --- 1. Navigate Internal Page ---
        case "navigate_to_page":
        case "open_budgets":
        case "open_savings_goals": {
          const target = action.target || "/app";
          const pathOnly = target.split("?")[0];
          if (!ALLOWED_INTERNAL_ROUTES.includes(pathOnly as (typeof ALLOWED_INTERNAL_ROUTES)[number])) {
            return { success: false, error: `Unauthorized route: ${target}` };
          }

          if (navigateCallback) {
            navigateCallback(target);
          } else {
            window.location.href = target;
          }
          return { success: true, result: `Navigated to ${target}` };
        }

        // --- 2. Open Expenses with Filter ---
        case "open_expenses": {
          const target = "/app/transactions?type=expense";
          if (navigateCallback) {
            navigateCallback(target);
          } else {
            // eslint-disable-next-line @next/next/no-location-assign-relative-destination
            window.location.href = target;
          }
          return { success: true, result: "Opened Transactions with Expense filter applied." };
        }

        // --- 3. Set Theme ---
        case "set_theme": {
          const theme = (action.parameters?.theme as string) || action.target || "emerald-midnight";
          if (!ALLOWED_THEMES.includes(theme as (typeof ALLOWED_THEMES)[number])) {
            return { success: false, error: `Unsupported theme: ${theme}` };
          }

          document.documentElement.setAttribute("data-theme", theme);
          localStorage.setItem("fyza_theme", theme);
          window.dispatchEvent(new Event("fyza_theme_changed"));
          return { success: true, result: `Switched theme to ${theme}` };
        }

        // --- 4. Go Back ---
        case "go_back": {
          window.history.back();
          return { success: true, result: "Navigated back to previous page." };
        }

        // --- 5. Open Authorized External URL ---
        case "open_authorized_external_url": {
          const url = action.target;
          if (!url) {
            return { success: false, error: "Missing destination URL." };
          }

          // If extension is installed, delegate tab opening to extension
          if (this.isExtensionInstalled()) {
            return await this.sendExtensionCommand("open_authorized_external_url", { url });
          }

          // Safe browser fallback with noopener and noreferrer
          const win = window.open(url, "_blank", "noopener,noreferrer");
          if (win) {
            return { success: true, result: `Opened authorized external site in new tab: ${url}` };
          } else {
            return { success: false, error: "Popup was blocked by the browser. Please allow popups." };
          }
        }

        // --- 6. External Browser Extension Actions ---
        case "read_page_content":
        case "summarize_authorized_page":
        case "find_visible_text":
        case "fill_permitted_form":
        case "click_permitted_element": {
          if (!this.isExtensionInstalled()) {
            return {
              success: false,
              error:
                "This action requires the Fyza Browser Control Extension. Please install the companion extension to interact with external browser tabs.",
            };
          }
          return await this.sendExtensionCommand(action.type, action.parameters);
        }

        default:
          return { success: false, error: `Unknown action type: ${action.type}` };
      }
    } catch (err: unknown) {
      return { success: false, error: (err as Error)?.message || "Execution failed unexpectedly." };
    }
  }

  /**
   * Send an authorized message to the extension content-bridge
   */
  private static sendExtensionCommand(
    actionType: string,
    payload?: Record<string, unknown>
  ): Promise<{ success: boolean; result?: string; error?: string }> {
    return new Promise((resolve) => {
      const actionId = `cmd-${Date.now()}`;
      const timeoutId = setTimeout(() => {
        window.removeEventListener("message", handleResponse);
        resolve({
          success: false,
          error: "Extension action timed out after 10 seconds. Check if the authorized tab is responsive.",
        });
      }, 10000);

      const handleResponse = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        const data = event.data as ExtensionBridgeMessage;
        if (data?.type === "FYZA_AGENT_RESPONSE" && data.actionId === actionId) {
          clearTimeout(timeoutId);
          window.removeEventListener("message", handleResponse);
          if (data.success) {
            resolve({ success: true, result: (data.payload?.summary as string) || (data.payload?.result as string) || "Action completed by extension." });
          } else {
            resolve({ success: false, error: data.error || "Extension action failed." });
          }
        }
      };

      window.addEventListener("message", handleResponse);

      // Post message to extension content script listening on this origin
      window.postMessage(
        {
          type: "FYZA_AGENT_REQUEST",
          actionId,
          actionType,
          payload,
          source: "fyza-web",
        },
        window.location.origin
      );
    });
  }
}
