import { type Category, type AccountType } from "./types";

// ============================================================
// Default Categories
// ============================================================

export const DEFAULT_EXPENSE_CATEGORIES: Omit<Category, "id" | "user_id" | "created_at">[] = [
  { name: "Food & Dining", type: "expense", icon: "UtensilsCrossed", color: "#FF6B6B", is_default: true, parent_id: null },
  { name: "Groceries", type: "expense", icon: "ShoppingCart", color: "#FF8E53", is_default: true, parent_id: null },
  { name: "Transportation", type: "expense", icon: "Car", color: "#4ECDC4", is_default: true, parent_id: null },
  { name: "Shopping", type: "expense", icon: "ShoppingBag", color: "#A78BFA", is_default: true, parent_id: null },
  { name: "Entertainment", type: "expense", icon: "Film", color: "#F472B6", is_default: true, parent_id: null },
  { name: "Bills & Utilities", type: "expense", icon: "Receipt", color: "#60A5FA", is_default: true, parent_id: null },
  { name: "Health & Medical", type: "expense", icon: "Heart", color: "#34D399", is_default: true, parent_id: null },
  { name: "Education", type: "expense", icon: "GraduationCap", color: "#FBBF24", is_default: true, parent_id: null },
  { name: "Personal Care", type: "expense", icon: "Sparkles", color: "#C084FC", is_default: true, parent_id: null },
  { name: "Housing & Rent", type: "expense", icon: "Home", color: "#FB923C", is_default: true, parent_id: null },
  { name: "Insurance", type: "expense", icon: "Shield", color: "#2DD4BF", is_default: true, parent_id: null },
  { name: "Subscriptions", type: "expense", icon: "CreditCard", color: "#818CF8", is_default: true, parent_id: null },
  { name: "Travel", type: "expense", icon: "Plane", color: "#38BDF8", is_default: true, parent_id: null },
  { name: "Gifts & Donations", type: "expense", icon: "Gift", color: "#FB7185", is_default: true, parent_id: null },
  { name: "Other Expense", type: "expense", icon: "MoreHorizontal", color: "#94A3B8", is_default: true, parent_id: null },
];

export const DEFAULT_INCOME_CATEGORIES: Omit<Category, "id" | "user_id" | "created_at">[] = [
  { name: "Salary", type: "income", icon: "Briefcase", color: "#48D6A0", is_default: true, parent_id: null },
  { name: "Freelance", type: "income", icon: "Laptop", color: "#34D399", is_default: true, parent_id: null },
  { name: "Business", type: "income", icon: "Building2", color: "#60A5FA", is_default: true, parent_id: null },
  { name: "Investment Returns", type: "income", icon: "TrendingUp", color: "#FBBF24", is_default: true, parent_id: null },
  { name: "Rental Income", type: "income", icon: "Home", color: "#FB923C", is_default: true, parent_id: null },
  { name: "Interest", type: "income", icon: "Percent", color: "#A78BFA", is_default: true, parent_id: null },
  { name: "Refund", type: "income", icon: "RotateCcw", color: "#4ECDC4", is_default: true, parent_id: null },
  { name: "Other Income", type: "income", icon: "Plus", color: "#94A3B8", is_default: true, parent_id: null },
];

export const DEFAULT_TRANSFER_CATEGORIES: Omit<Category, "id" | "user_id" | "created_at">[] = [
  { name: "Transfer", type: "transfer", icon: "ArrowLeftRight", color: "#79C9E8", is_default: true, parent_id: null },
];

// ============================================================
// Account Types
// ============================================================

export const ACCOUNT_TYPES: { value: AccountType; label: string; icon: string }[] = [
  { value: "cash", label: "Cash", icon: "Banknote" },
  { value: "savings", label: "Savings Account", icon: "PiggyBank" },
  { value: "checking", label: "Bank Account", icon: "Building2" },
  { value: "wallet", label: "Digital Wallet", icon: "Wallet" },
  { value: "credit", label: "Credit Card", icon: "CreditCard" },
  { value: "other", label: "Other", icon: "MoreHorizontal" },
];

// ============================================================
// Currency Configuration
// ============================================================

export const CURRENCIES = [
  { code: "INR", symbol: "₹", name: "Indian Rupee", locale: "en-IN" },
  { code: "USD", symbol: "$", name: "US Dollar", locale: "en-US" },
  { code: "EUR", symbol: "€", name: "Euro", locale: "en-DE" },
  { code: "GBP", symbol: "£", name: "British Pound", locale: "en-GB" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen", locale: "ja-JP" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar", locale: "en-AU" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar", locale: "en-CA" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar", locale: "en-SG" },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham", locale: "ar-AE" },
];

// ============================================================
// Goal Categories
// ============================================================

export const GOAL_CATEGORIES = [
  { value: "emergency", label: "Emergency Fund", icon: "Shield" },
  { value: "education", label: "Education", icon: "GraduationCap" },
  { value: "travel", label: "Travel", icon: "Plane" },
  { value: "electronics", label: "Electronics", icon: "Laptop" },
  { value: "vehicle", label: "Vehicle", icon: "Car" },
  { value: "home", label: "Home", icon: "Home" },
  { value: "wedding", label: "Wedding", icon: "Heart" },
  { value: "retirement", label: "Retirement", icon: "Sunset" },
  { value: "investment", label: "Investment", icon: "TrendingUp" },
  { value: "other", label: "Other", icon: "Target" },
];

// ============================================================
// Theming System — 5 Curated Multi-Colour Themes
// ============================================================

export type FyzaTheme =
  | "emerald-midnight"
  | "violet-intelligence"
  | "ocean-blue"
  | "amber-wealth"
  | "clean-light";

export interface ThemeOption {
  id: FyzaTheme;
  name: string;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  bgColor: string;
  isDark: boolean;
}

export const FYZA_THEMES: ThemeOption[] = [
  {
    id: "emerald-midnight",
    name: "Emerald Midnight",
    description: "Cyber jade & obsidian fintech dark mode",
    primaryColor: "#31E6A0",
    secondaryColor: "#23D5C5",
    bgColor: "#080C10",
    isDark: true,
  },
  {
    id: "violet-intelligence",
    name: "Violet Intelligence",
    description: "Deep amethyst & neon neural glow",
    primaryColor: "#9D68FF",
    secondaryColor: "#38E1FF",
    bgColor: "#090714",
    isDark: true,
  },
  {
    id: "ocean-blue",
    name: "Ocean Blue",
    description: "Maritime deep navy & radiant cyan",
    primaryColor: "#3894FF",
    secondaryColor: "#22D3EE",
    bgColor: "#050B14",
    isDark: true,
  },
  {
    id: "amber-wealth",
    name: "Amber Wealth",
    description: "Obsidian gold & sovereign bronze",
    primaryColor: "#F59E0B",
    secondaryColor: "#FBBF24",
    bgColor: "#0A0805",
    isDark: true,
  },
  {
    id: "clean-light",
    name: "Clean Light",
    description: "Executive daylight minimalism",
    primaryColor: "#0D9488",
    secondaryColor: "#0284C7",
    bgColor: "#F8FAFC",
    isDark: false,
  },
];

// ============================================================
// Navigation
// ============================================================

export const APP_NAVIGATION = [
  { label: "Overview", href: "/app", icon: "LayoutDashboard" },
  { label: "Transactions", href: "/app/transactions", icon: "ArrowLeftRight" },
  { label: "Subscriptions", href: "/app/subscriptions", icon: "CreditCard", badge: "New" },
  { label: "Budgets", href: "/app/budgets", icon: "PieChart" },
  { label: "Savings Goals", href: "/app/goals", icon: "Target" },
  { label: "Analytics", href: "/app/analytics", icon: "BarChart3" },
  { label: "Forecast", href: "/app/forecast", icon: "TrendingUp" },
  { label: "Fyza AI", href: "/app/ai-assistant", icon: "Bot", badge: "AI" },
  { label: "Accounts", href: "/app/accounts", icon: "Wallet" },
  { label: "Reports", href: "/app/reports", icon: "FileText" },
  { label: "Settings", href: "/app/settings", icon: "Settings" },
];

// ============================================================
// Budget Alert Thresholds
// ============================================================

export const DEFAULT_ALERT_THRESHOLDS = [50, 75, 90, 100];

// ============================================================
// Date Presets
// ============================================================

export const DATE_RANGE_PRESETS = [
  { label: "This Week", value: "this_week" },
  { label: "Last Week", value: "last_week" },
  { label: "This Month", value: "this_month" },
  { label: "Last Month", value: "last_month" },
  { label: "Last 3 Months", value: "last_3_months" },
  { label: "Last 6 Months", value: "last_6_months" },
  { label: "This Year", value: "this_year" },
  { label: "Last Year", value: "last_year" },
  { label: "All Time", value: "all_time" },
];

// ============================================================
// Chart Colors
// ============================================================

export const CHART_COLORS = [
  "#48D6A0", "#79C9E8", "#FF6B6B", "#FBBF24", "#A78BFA",
  "#F472B6", "#34D399", "#FB923C", "#60A5FA", "#4ECDC4",
  "#818CF8", "#FB7185", "#38BDF8", "#C084FC", "#2DD4BF",
];
