/**
 * FYZA AI WEBSITE CONTROL AGENT — ALLOWLISTED ACTION REGISTRY
 * Validates, categorizes, and controls action safety boundaries.
 */

import type { AgentAction, AgentActionType, ActionRiskLevel } from "./types";

export const ALLOWED_INTERNAL_ROUTES = [
  "/app",
  "/app/transactions",
  "/app/budgets",
  "/app/goals",
  "/app/accounts",
  "/app/analytics",
  "/app/forecast",
  "/app/subscriptions",
  "/app/calendar",
  "/app/reports",
  "/app/settings",
  "/app/ai-assistant",
] as const;

export const ALLOWED_THEMES = [
  "emerald-midnight",
  "violet-intelligence",
  "ocean-blue",
  "amber-wealth",
  "clean-light",
] as const;

// Block dangerous protocols and private network SSRF targets
const BLOCKED_PROTOCOLS = ["javascript:", "data:", "file:", "chrome:", "about:", "vbscript:"];
const BLOCKED_HOST_PATTERNS = [
  /^169\.254\./, // AWS / Cloud metadata
  /^10\./, // Private RFC 1918 Class A
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // Private Class B
  /^192\.168\./, // Private Class C
  /^0\.0\.0\.0/,
];

export function sanitizeAndValidateUrl(rawUrl: string): { valid: boolean; url?: string; error?: string } {
  try {
    let clean = rawUrl.trim();
    const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(clean);
    if (!hasScheme) {
      clean = `https://${clean}`;
    }

    const parsed = new URL(clean);

    if (BLOCKED_PROTOCOLS.some((p) => parsed.protocol.toLowerCase() === p)) {
      return { valid: false, error: "Disallowed URL protocol for external security." };
    }

    if (parsed.protocol !== "https:" && !parsed.hostname.includes("localhost")) {
      return { valid: false, error: "Only secure HTTPS URLs are authorized for external browser actions." };
    }

    const host = parsed.hostname.toLowerCase();

    // Check private network IP ranges
    if (BLOCKED_HOST_PATTERNS.some((pattern) => pattern.test(host))) {
      return { valid: false, error: "Access to private or local network infrastructure is strictly prohibited." };
    }

    return { valid: true, url: parsed.toString() };
  } catch {
    return { valid: false, error: "Malformed URL provided." };
  }
}

export function determineActionRisk(type: AgentActionType): ActionRiskLevel {
  switch (type) {
    case "navigate_to_page":
    case "set_theme":
    case "set_date_filter":
    case "open_expenses":
    case "open_budgets":
    case "open_savings_goals":
    case "select_dashboard_view":
    case "go_back":
      return "low";

    case "open_authorized_external_url":
    case "read_page_content":
    case "find_visible_text":
    case "summarize_authorized_page":
    case "quick_add_transaction_draft":
      return "medium";

    case "delete_transaction_request":
    case "fill_permitted_form":
    case "click_permitted_element":
      return "high";

    default:
      return "medium";
  }
}

export function createValidatedAction(
  type: AgentActionType,
  title: string,
  description: string,
  target?: string,
  parameters?: Record<string, unknown>
): { success: boolean; action?: AgentAction; error?: string } {
  const risk = determineActionRisk(type);

  // Validate internal routes
  if (type === "navigate_to_page" || type === "open_expenses" || type === "open_budgets" || type === "open_savings_goals") {
    const route = target?.split("?")[0];
    if (route && !ALLOWED_INTERNAL_ROUTES.includes(route as (typeof ALLOWED_INTERNAL_ROUTES)[number])) {
      return { success: false, error: `Unauthorized route destination: ${route}` };
    }
  }

  // Validate themes
  if (type === "set_theme") {
    const theme = (parameters?.theme as string) || target;
    if (theme && !ALLOWED_THEMES.includes(theme as (typeof ALLOWED_THEMES)[number])) {
      return { success: false, error: `Invalid theme selection: ${theme}. Supported: ${ALLOWED_THEMES.join(", ")}` };
    }
  }

  // Validate external URLs
  if (type === "open_authorized_external_url" && target) {
    const check = sanitizeAndValidateUrl(target);
    if (!check.valid || !check.url) {
      return { success: false, error: check.error || "External URL failed safety validation." };
    }
    target = check.url;
  }

  const requiresApproval = risk === "medium" || risk === "high";

  const action: AgentAction = {
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    title,
    description,
    risk,
    target,
    parameters,
    requiresApproval,
    status: requiresApproval ? "waiting_approval" : "preparing",
    createdAt: new Date().toISOString(),
  };

  return { success: true, action };
}
