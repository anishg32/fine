// ============================================================
// Fyza — Core Type Definitions
// All amounts are stored in minor currency units (paise/cents)
// ============================================================

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  preferred_currency: string;
  locale: string;
  timezone: string;
  week_start: "monday" | "sunday";
  date_format: string;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  currency: string;
  opening_balance: number; // minor units
  current_balance: number; // minor units
  description: string | null;
  is_archived: boolean;
  icon: string | null;
  color: string | null;
  created_at: string;
  updated_at: string;
}

export type AccountType = "cash" | "savings" | "checking" | "wallet" | "credit" | "other";

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string;
  type: TransactionType;
  amount: number; // minor units, always positive
  currency: string;
  category_id: string | null;
  description: string;
  transaction_date: string;
  merchant: string | null;
  notes: string | null;
  tags: string[];
  is_recurring: boolean;
  recurring_id: string | null;
  transfer_account_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  category?: Category;
  account?: Account;
}

export type TransactionType = "income" | "expense" | "transfer";

export interface Category {
  id: string;
  user_id: string | null; // null for default categories
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
  is_default: boolean;
  parent_id: string | null;
  created_at: string;
}

export interface Budget {
  id: string;
  user_id: string;
  name: string;
  month: number; // 1-12
  year: number;
  total_limit: number; // minor units
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Computed
  categories?: BudgetCategory[];
  total_spent?: number;
}

export interface BudgetCategory {
  id: string;
  budget_id: string;
  category_id: string;
  limit_amount: number; // minor units
  created_at: string;
  // Computed
  spent?: number;
  category?: Category;
}

export interface Goal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number; // minor units
  current_amount: number; // minor units
  target_date: string | null;
  category: GoalCategory;
  description: string | null;
  icon: string | null;
  color: string | null;
  status: GoalStatus;
  created_at: string;
  updated_at: string;
  // Computed
  contributions?: GoalContribution[];
}

export type GoalCategory =
  | "emergency"
  | "education"
  | "travel"
  | "electronics"
  | "vehicle"
  | "home"
  | "wedding"
  | "retirement"
  | "investment"
  | "other";

export type GoalStatus = "active" | "paused" | "completed" | "archived";

export interface GoalContribution {
  id: string;
  goal_id: string;
  amount: number; // minor units
  note: string | null;
  contributed_at: string;
  created_at: string;
}

export type RecurringFrequency =
  | "daily"
  | "weekly"
  | "biweekly"
  | "monthly"
  | "quarterly"
  | "yearly"
  | "custom";

export type RecurringStatus = "active" | "paused" | "cancelled" | "archived";

export interface RecurringTransaction {
  id: string;
  user_id: string;
  account_id: string;
  type: TransactionType;
  amount: number;
  currency: string;
  category_id: string | null;
  description: string;
  merchant: string | null;
  frequency: RecurringFrequency;
  interval: number; // e.g., every 2 weeks, every 3 months
  start_date: string;
  end_date: string | null;
  next_date: string;
  is_active: boolean;
  status?: RecurringStatus;
  payment_method_desc?: string | null;
  notes?: string | null;
  cancellation_url?: string | null;
  reminder_days_before?: number; // e.g. 1, 3, 7 days before
  last_paid_date?: string | null;
  last_transaction_id?: string | null;
  last_generated: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Financial Calendar Types
// ============================================================

export type CalendarEventType =
  | "subscription"
  | "recurring_bill"
  | "planned_expense"
  | "expected_income"
  | "goal_deadline"
  | "completed_transaction";

export interface CalendarEvent {
  id: string;
  date: string; // YYYY-MM-DD
  type: CalendarEventType;
  title: string;
  amount: number; // minor units
  currency: string;
  status: "planned" | "completed" | "overdue" | "paused";
  category?: Category;
  account?: Account;
  sourceId: string; // recurring_id, goal_id, or transaction_id
  merchant?: string | null;
  notes?: string | null;
  cancellation_url?: string | null;
  isOverdue?: boolean;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  action_url: string | null;
  created_at: string;
}

export type NotificationType =
  | "budget_warning"
  | "budget_exceeded"
  | "goal_milestone"
  | "goal_completed"
  | "recurring_reminder"
  | "monthly_summary"
  | "system";

export interface AIConversation {
  id: string;
  user_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
  messages?: AIMessage[];
}

export interface AIMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
}

export interface UserPreferences {
  id: string;
  user_id: string;
  notifications_enabled: boolean;
  budget_alerts: boolean;
  budget_alert_thresholds: number[]; // [50, 75, 90, 100]
  recurring_reminders: boolean;
  goal_milestones: boolean;
  monthly_summaries: boolean;
  email_notifications: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Dashboard & Analytics Types
// ============================================================

export interface DashboardSummary {
  totalBalance: number;
  periodIncome: number;
  periodExpenses: number;
  netCashFlow: number;
  savingsProgress: number;
  previousPeriodIncome: number;
  previousPeriodExpenses: number;
}

export interface SpendingByCategory {
  category: string;
  categoryId: string;
  icon: string;
  color: string;
  amount: number;
  percentage: number;
  count: number;
}

export interface CashFlowData {
  date: string;
  income: number;
  expenses: number;
  net: number;
}

export interface DateRange {
  from: Date;
  to: Date;
  label?: string;
}

// ============================================================
// Forecast Types
// ============================================================

export interface ForecastScenario {
  label: string;
  type: "conservative" | "expected" | "optimistic";
  monthlyIncome: number;
  monthlyExpenses: number;
  savingsRate: number;
  data: ForecastDataPoint[];
}

export interface ForecastDataPoint {
  date: string;
  balance: number;
  income: number;
  expenses: number;
  isProjection: boolean;
}

// ============================================================
// Form & UI Types
// ============================================================

export interface SelectOption {
  label: string;
  value: string;
  icon?: string;
}

export interface TableColumn<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  render?: (item: T) => React.ReactNode;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
  total: number;
}

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  count?: number;
}
