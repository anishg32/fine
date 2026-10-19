/**
 * FYZA AI WEBSITE CONTROL AGENT — TYPE DEFINITIONS
 * Defines allowlisted actions, risk tiers, execution states, and messaging protocols.
 */

export type AgentActionType =
  // Internal Fyza Navigation & Display Actions (LOW RISK)
  | "navigate_to_page"
  | "set_theme"
  | "set_date_filter"
  | "open_expenses"
  | "open_budgets"
  | "open_savings_goals"
  | "select_dashboard_view"
  | "go_back"
  // Internal Transaction Actions (MEDIUM / HIGH RISK)
  | "quick_add_transaction_draft"
  | "delete_transaction_request"
  // External Browser Actions (MEDIUM RISK — requires explicit user approval)
  | "open_authorized_external_url"
  | "read_page_content"
  | "find_visible_text"
  | "summarize_authorized_page"
  | "fill_permitted_form"
  | "click_permitted_element";

export type ActionRiskLevel = "low" | "medium" | "high";

export type ActionStatus =
  | "idle"
  | "preparing"
  | "waiting_approval"
  | "executing"
  | "completed"
  | "rejected"
  | "cancelled"
  | "failed";

export interface AgentAction {
  id: string;
  type: AgentActionType;
  title: string;
  description: string;
  risk: ActionRiskLevel;
  target?: string;
  parameters?: Record<string, unknown>;
  requiresApproval: boolean;
  status: ActionStatus;
  result?: string;
  error?: string;
  createdAt: string;
}

export interface ExtensionBridgeMessage {
  type: "FYZA_AGENT_REQUEST" | "FYZA_AGENT_RESPONSE" | "FYZA_AGENT_PING" | "FYZA_AGENT_PONG";
  actionId?: string;
  actionType?: AgentActionType;
  payload?: Record<string, unknown>;
  success?: boolean;
  error?: string;
  source: "fyza-web" | "fyza-extension";
}

export interface ExtensionStatus {
  isInstalled: boolean;
  version?: string;
  authorizedDomains: string[];
  activeTabTitle?: string;
  activeTabUrl?: string;
}
