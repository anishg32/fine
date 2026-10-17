// ============================================================
// FYZA APPLICATION STORE & PERSISTENCE LAYER
// Provides reactive client-side store with LocalStorage caching
// and Supabase cloud synchronization bridge.
// All monetary values in minor currency units (paise/cents).
// ============================================================

import type {
  Account,
  Transaction,
  Category,
  Budget,
  Goal,
  GoalContribution,
  RecurringTransaction,
  RecurringStatus,
  CalendarEvent,
  CalendarEventType,
  Notification,
  Profile,
  UserPreferences,
} from "./types";
import {
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
  DEFAULT_TRANSFER_CATEGORIES,
} from "./constants";
import { calculateNextBillingDate } from "./calculations";
import { formatCurrency } from "./utils";

const STORAGE_KEYS = {
  ACCOUNTS: "fyza_accounts_v1",
  TRANSACTIONS: "fyza_transactions_v1",
  CATEGORIES: "fyza_categories_v1",
  BUDGETS: "fyza_budgets_v1",
  GOALS: "fyza_goals_v1",
  RECURRING: "fyza_recurring_v1",
  RECURRING_OCCURRENCES: "fyza_recurring_occurrences_v1",
  NOTIFIED_BILLS: "fyza_notified_bills_v1",
  NOTIFICATIONS: "fyza_notifications_v1",
  PROFILE: "fyza_profile_v1",
  PREFERENCES: "fyza_preferences_v1",
  DEMO_MODE: "fyza_demo_mode",
};

// ============================================================
// INITIAL SEED DATA GENERATOR (Realistic Indian Context, INR)
// ============================================================

export function generateSeedData(): {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  goals: Goal[];
  recurring: RecurringTransaction[];
  notifications: Notification[];
  profile: Profile;
  preferences: UserPreferences;
} {
  const SEED_TIMESTAMP = "2026-10-14T10:00:00.000Z";
  const now = new Date("2026-10-14T10:00:00.000Z");
  const year: number = 2026;
  const month: number = 10; // 1-12
  const monthStr = "10";
  const prevMonth: number = 9;
  const prevYear: number = 2026;
  const prevMonthStr = "09";

  // Categories
  const categories: Category[] = [
    ...DEFAULT_INCOME_CATEGORIES.map((c, i) => ({
      ...c,
      id: `cat-inc-${i + 1}`,
      user_id: null,
      created_at: new Date(year, month - 2, 1).toISOString(),
    })),
    ...DEFAULT_EXPENSE_CATEGORIES.map((c, i) => ({
      ...c,
      id: `cat-exp-${i + 1}`,
      user_id: null,
      created_at: new Date(year, month - 2, 1).toISOString(),
    })),
    ...DEFAULT_TRANSFER_CATEGORIES.map((c, i) => ({
      ...c,
      id: `cat-trans-${i + 1}`,
      user_id: null,
      created_at: new Date(year, month - 2, 1).toISOString(),
    })),
  ];

  // Accounts
  const accounts: Account[] = [
    {
      id: "acc-1",
      user_id: "demo-user",
      name: "HDFC Salary Account",
      type: "checking",
      currency: "INR",
      opening_balance: 5000000, // ₹50,000.00
      current_balance: 18450000, // ₹1,84,500.00
      description: "Primary salary and auto-debit account",
      is_archived: false,
      icon: "Building2",
      color: "#48D6A0",
      created_at: new Date(year, month - 3, 1).toISOString(),
      updated_at: SEED_TIMESTAMP,
    },
    {
      id: "acc-2",
      user_id: "demo-user",
      name: "ICICI Savings Reserve",
      type: "savings",
      currency: "INR",
      opening_balance: 20000000, // ₹2,00,000.00
      current_balance: 34500000, // ₹3,45,000.00
      description: "High-yield emergency fund and SIP buffer",
      is_archived: false,
      icon: "PiggyBank",
      color: "#79C9E8",
      created_at: new Date(year, month - 3, 1).toISOString(),
      updated_at: SEED_TIMESTAMP,
    },
    {
      id: "acc-3",
      user_id: "demo-user",
      name: "Cash & UPI Wallet",
      type: "wallet",
      currency: "INR",
      opening_balance: 1000000, // ₹10,000.00
      current_balance: 685000, // ₹6,850.00
      description: "Daily small cash and wallet transactions",
      is_archived: false,
      icon: "Wallet",
      color: "#FBBF24",
      created_at: new Date(year, month - 3, 1).toISOString(),
      updated_at: SEED_TIMESTAMP,
    },
    {
      id: "acc-4",
      user_id: "demo-user",
      name: "Millennia Credit Card",
      type: "credit",
      currency: "INR",
      opening_balance: 0,
      current_balance: -2480000, // -₹24,800.00 (Outstanding bill)
      description: "Cashback card for dining, shopping & flight bookings",
      is_archived: false,
      icon: "CreditCard",
      color: "#FF6B6B",
      created_at: new Date(year, month - 3, 1).toISOString(),
      updated_at: SEED_TIMESTAMP,
    },
  ];

  // Helper to find category ID
  const getCatId = (name: string) =>
    categories.find((c) => c.name.toLowerCase().includes(name.toLowerCase()))?.id ||
    categories[0].id;

  // Realistic Transactions for Current and Previous Month
  const transactions: Transaction[] = [
    // Current month income
    {
      id: "tx-curr-1",
      user_id: "demo-user",
      account_id: "acc-1",
      type: "income",
      amount: 14500000, // ₹1,45,000.00
      currency: "INR",
      category_id: getCatId("Salary"),
      description: "Monthly Tech Salary Credited",
      transaction_date: `${year}-${monthStr}-01`,
      merchant: "Razorpay / Stripe Payments",
      notes: "Net monthly in-hand salary",
      tags: ["salary", "fixed-income"],
      is_recurring: true,
      recurring_id: "rec-1",
      transfer_account_id: null,
      created_at: new Date(year, month - 1, 1).toISOString(),
      updated_at: new Date(year, month - 1, 1).toISOString(),
    },
    {
      id: "tx-curr-2",
      user_id: "demo-user",
      account_id: "acc-1",
      type: "income",
      amount: 2800000, // ₹28,000.00
      currency: "INR",
      category_id: getCatId("Freelance"),
      description: "UI/UX Consultation Milestone",
      transaction_date: `${year}-${monthStr}-08`,
      merchant: "Fintech Client Corp",
      notes: "Sprint 2 architecture review",
      tags: ["freelance", "side-income"],
      is_recurring: false,
      recurring_id: null,
      transfer_account_id: null,
      created_at: new Date(year, month - 1, 8).toISOString(),
      updated_at: new Date(year, month - 1, 8).toISOString(),
    },
    // Current month expenses
    {
      id: "tx-curr-3",
      user_id: "demo-user",
      account_id: "acc-1",
      type: "expense",
      amount: 3200000, // ₹32,000.00
      currency: "INR",
      category_id: getCatId("Housing"),
      description: "Apartment Rent & Maintenance",
      transaction_date: `${year}-${monthStr}-02`,
      merchant: "Prestige Lakeview Society",
      notes: "Auto-debited on 2nd",
      tags: ["rent", "essential"],
      is_recurring: true,
      recurring_id: "rec-2",
      transfer_account_id: null,
      created_at: new Date(year, month - 1, 2).toISOString(),
      updated_at: new Date(year, month - 1, 2).toISOString(),
    },
    {
      id: "tx-curr-4",
      user_id: "demo-user",
      account_id: "acc-1",
      type: "expense",
      amount: 1500000, // ₹15,000.00
      currency: "INR",
      category_id: getCatId("Investment"),
      description: "Nifty 50 Index Mutual Fund SIP",
      transaction_date: `${year}-${monthStr}-05`,
      merchant: "Zerodha Coin",
      notes: "Systematic Investment Plan",
      tags: ["sip", "investments"],
      is_recurring: true,
      recurring_id: "rec-3",
      transfer_account_id: null,
      created_at: new Date(year, month - 1, 5).toISOString(),
      updated_at: new Date(year, month - 1, 5).toISOString(),
    },
    {
      id: "tx-curr-5",
      user_id: "demo-user",
      account_id: "acc-4",
      type: "expense",
      amount: 845000, // ₹8,450.00
      currency: "INR",
      category_id: getCatId("Groceries"),
      description: "Monthly Organic Groceries & Staples",
      transaction_date: `${year}-${monthStr}-06`,
      merchant: "Nature's Basket / Blinkit",
      notes: "Bulk supplies",
      tags: ["food", "groceries"],
      is_recurring: false,
      recurring_id: null,
      transfer_account_id: null,
      created_at: new Date(year, month - 1, 6).toISOString(),
      updated_at: new Date(year, month - 1, 6).toISOString(),
    },
    {
      id: "tx-curr-6",
      user_id: "demo-user",
      account_id: "acc-3",
      type: "expense",
      amount: 245000, // ₹2,450.00
      currency: "INR",
      category_id: getCatId("Food & Dining"),
      description: "Weekend Brunch with Friends",
      transaction_date: `${year}-${monthStr}-09`,
      merchant: "Third Wave Coffee Roasters",
      notes: "",
      tags: ["dining", "social"],
      is_recurring: false,
      recurring_id: null,
      transfer_account_id: null,
      created_at: new Date(year, month - 1, 9).toISOString(),
      updated_at: new Date(year, month - 1, 9).toISOString(),
    },
    {
      id: "tx-curr-7",
      user_id: "demo-user",
      account_id: "acc-1",
      type: "expense",
      amount: 349900, // ₹3,499.00
      currency: "INR",
      category_id: getCatId("Bills & Utilities"),
      description: "Gigabit Fiber Broadband + Electricity",
      transaction_date: `${year}-${monthStr}-10`,
      merchant: "Airtel Xstream & BESCOM",
      notes: "",
      tags: ["utilities", "bills"],
      is_recurring: true,
      recurring_id: null,
      transfer_account_id: null,
      created_at: new Date(year, month - 1, 10).toISOString(),
      updated_at: new Date(year, month - 1, 10).toISOString(),
    },
    {
      id: "tx-curr-8",
      user_id: "demo-user",
      account_id: "acc-4",
      type: "expense",
      amount: 620000, // ₹6,200.00
      currency: "INR",
      category_id: getCatId("Shopping"),
      description: "Noise-Cancelling Headphones Sale",
      transaction_date: `${year}-${monthStr}-11`,
      merchant: "Amazon India",
      notes: "Diwali discount festival purchase",
      tags: ["tech", "electronics"],
      is_recurring: false,
      recurring_id: null,
      transfer_account_id: null,
      created_at: new Date(year, month - 1, 11).toISOString(),
      updated_at: new Date(year, month - 1, 11).toISOString(),
    },
    {
      id: "tx-curr-9",
      user_id: "demo-user",
      account_id: "acc-1",
      type: "transfer",
      amount: 2500000, // ₹25,000.00 transfer to ICICI Emergency Fund
      currency: "INR",
      category_id: getCatId("Transfer"),
      description: "Monthly Savings Allocation to Emergency Reserve",
      transaction_date: `${year}-${monthStr}-03`,
      merchant: null,
      notes: "Internal account transfer - doesn't affect spending",
      tags: ["savings", "transfer"],
      is_recurring: false,
      recurring_id: null,
      transfer_account_id: "acc-2",
      created_at: new Date(year, month - 1, 3).toISOString(),
      updated_at: new Date(year, month - 1, 3).toISOString(),
    },
    // Previous month historical transactions for rich comparison
    {
      id: "tx-prev-1",
      user_id: "demo-user",
      account_id: "acc-1",
      type: "income",
      amount: 14500000, // ₹1,45,000.00
      currency: "INR",
      category_id: getCatId("Salary"),
      description: "Monthly Salary Credited",
      transaction_date: `${prevYear}-${prevMonthStr}-01`,
      merchant: "Razorpay / Stripe",
      notes: "",
      tags: ["salary"],
      is_recurring: true,
      recurring_id: null,
      transfer_account_id: null,
      created_at: new Date(prevYear, prevMonth - 1, 1).toISOString(),
      updated_at: new Date(prevYear, prevMonth - 1, 1).toISOString(),
    },
    {
      id: "tx-prev-2",
      user_id: "demo-user",
      account_id: "acc-1",
      type: "expense",
      amount: 3200000, // ₹32,000.00
      currency: "INR",
      category_id: getCatId("Housing"),
      description: "Apartment Rent & Maintenance",
      transaction_date: `${prevYear}-${prevMonthStr}-02`,
      merchant: "Prestige Lakeview",
      notes: "",
      tags: ["rent"],
      is_recurring: true,
      recurring_id: null,
      transfer_account_id: null,
      created_at: new Date(prevYear, prevMonth - 1, 2).toISOString(),
      updated_at: new Date(prevYear, prevMonth - 1, 2).toISOString(),
    },
    {
      id: "tx-prev-3",
      user_id: "demo-user",
      account_id: "acc-4",
      type: "expense",
      amount: 1140000, // ₹11,400.00
      currency: "INR",
      category_id: getCatId("Food & Dining"),
      description: "Dining Out & Food Deliveries",
      transaction_date: `${prevYear}-${prevMonthStr}-15`,
      merchant: "Swiggy / Zomato",
      notes: "",
      tags: ["dining"],
      is_recurring: false,
      recurring_id: null,
      transfer_account_id: null,
      created_at: new Date(prevYear, prevMonth - 1, 15).toISOString(),
      updated_at: new Date(prevYear, prevMonth - 1, 15).toISOString(),
    },
    {
      id: "tx-prev-4",
      user_id: "demo-user",
      account_id: "acc-1",
      type: "expense",
      amount: 1500000, // ₹15,000.00
      currency: "INR",
      category_id: getCatId("Investment"),
      description: "Nifty 50 Index Mutual Fund SIP",
      transaction_date: `${prevYear}-${prevMonthStr}-05`,
      merchant: "Zerodha",
      notes: "",
      tags: ["sip"],
      is_recurring: true,
      recurring_id: null,
      transfer_account_id: null,
      created_at: new Date(prevYear, prevMonth - 1, 5).toISOString(),
      updated_at: new Date(prevYear, prevMonth - 1, 5).toISOString(),
    },
  ];

  // Current Month Budget
  const budgets: Budget[] = [
    {
      id: "bud-1",
      user_id: "demo-user",
      name: `${now.toLocaleString("en-US", { month: "long" })} General Budget`,
      month,
      year,
      total_limit: 8500000, // ₹85,000.00 monthly cap
      is_active: true,
      created_at: new Date(year, month - 1, 1).toISOString(),
      updated_at: SEED_TIMESTAMP,
      categories: [
        {
          id: "bc-1",
          budget_id: "bud-1",
          category_id: getCatId("Housing"),
          limit_amount: 3500000, // ₹35,000
          created_at: SEED_TIMESTAMP,
        },
        {
          id: "bc-2",
          budget_id: "bud-1",
          category_id: getCatId("Groceries"),
          limit_amount: 1500000, // ₹15,000
          created_at: SEED_TIMESTAMP,
        },
        {
          id: "bc-3",
          budget_id: "bud-1",
          category_id: getCatId("Food & Dining"),
          limit_amount: 800000, // ₹8,000
          created_at: SEED_TIMESTAMP,
        },
        {
          id: "bc-4",
          budget_id: "bud-1",
          category_id: getCatId("Shopping"),
          limit_amount: 1200000, // ₹12,000
          created_at: SEED_TIMESTAMP,
        },
        {
          id: "bc-5",
          budget_id: "bud-1",
          category_id: getCatId("Bills & Utilities"),
          limit_amount: 600000, // ₹6,000
          created_at: SEED_TIMESTAMP,
        },
      ],
    },
  ];

  // Savings Goals
  const goals: Goal[] = [
    {
      id: "goal-1",
      user_id: "demo-user",
      name: "Emergency Safety Net (6 Months)",
      target_amount: 40000000, // ₹4,00,000.00
      current_amount: 28000000, // ₹2,80,000.00 (70% done)
      target_date: `${year + 1}-03-31`,
      category: "emergency",
      description: "6 months of living expenses parked in liquid instruments",
      icon: "Shield",
      color: "#48D6A0",
      status: "active",
      created_at: new Date(year, month - 4, 1).toISOString(),
      updated_at: SEED_TIMESTAMP,
    },
    {
      id: "goal-2",
      user_id: "demo-user",
      name: "MacBook Pro M-Series",
      target_amount: 22000000, // ₹2,20,000.00
      current_amount: 14500000, // ₹1,45,000.00 (66% done)
      target_date: `${year}-12-15`,
      category: "electronics",
      description: "High-performance development workstation",
      icon: "Laptop",
      color: "#79C9E8",
      status: "active",
      created_at: new Date(year, month - 3, 1).toISOString(),
      updated_at: SEED_TIMESTAMP,
    },
    {
      id: "goal-3",
      user_id: "demo-user",
      name: "Japan Spring Cherry Blossom Tour",
      target_amount: 30000000, // ₹3,00,000.00
      current_amount: 9000000, // ₹90,000.00 (30% done)
      target_date: `${year + 1}-04-10`,
      category: "travel",
      description: "Tokyo, Kyoto, and Osaka spring vacation trip",
      icon: "Plane",
      color: "#F472B6",
      status: "active",
      created_at: new Date(year, month - 2, 1).toISOString(),
      updated_at: SEED_TIMESTAMP,
    },
  ];

  // Recurring schedules
  const recurring: RecurringTransaction[] = [
    {
      id: "rec-1",
      user_id: "demo-user",
      account_id: "acc-1",
      type: "income",
      amount: 14500000,
      currency: "INR",
      category_id: getCatId("Salary"),
      description: "Monthly Salary Credited",
      merchant: "Employer Corp",
      frequency: "monthly",
      interval: 1,
      start_date: `${year}-01-01`,
      end_date: null,
      next_date: `${year}-11-01`,
      is_active: true,
      last_generated: `${year}-${monthStr}-01`,
      created_at: SEED_TIMESTAMP,
      updated_at: SEED_TIMESTAMP,
    },
    {
      id: "rec-2",
      user_id: "demo-user",
      account_id: "acc-1",
      type: "expense",
      amount: 3200000,
      currency: "INR",
      category_id: getCatId("Housing"),
      description: "Apartment Rent & Maintenance",
      merchant: "Prestige Society",
      frequency: "monthly",
      interval: 1,
      start_date: `${year}-01-02`,
      end_date: null,
      next_date: `${year}-11-02`,
      is_active: true,
      last_generated: `${year}-${monthStr}-02`,
      created_at: SEED_TIMESTAMP,
      updated_at: SEED_TIMESTAMP,
    },
    {
      id: "rec-3",
      user_id: "demo-user",
      account_id: "acc-1",
      type: "expense",
      amount: 1500000,
      currency: "INR",
      category_id: getCatId("Investment"),
      description: "Index Fund SIP Auto-Debit",
      merchant: "Zerodha Coin",
      frequency: "monthly",
      interval: 1,
      start_date: `${year}-01-05`,
      end_date: null,
      next_date: `${year}-11-05`,
      is_active: true,
      last_generated: `${year}-${monthStr}-05`,
      created_at: SEED_TIMESTAMP,
      updated_at: SEED_TIMESTAMP,
    },
    {
      id: "rec-4",
      user_id: "demo-user",
      account_id: "acc-4", // Credit Card
      type: "expense",
      amount: 64900,
      currency: "INR",
      category_id: getCatId("Subscriptions"),
      description: "Netflix 4K Premium Plan",
      merchant: "Netflix",
      frequency: "monthly",
      interval: 1,
      start_date: `${year}-01-18`,
      end_date: null,
      next_date: `${year}-10-18`,
      is_active: true,
      last_generated: `${year}-09-18`,
      created_at: SEED_TIMESTAMP,
      updated_at: SEED_TIMESTAMP,
    },
    {
      id: "rec-5",
      user_id: "demo-user",
      account_id: "acc-4", // Credit Card
      type: "expense",
      amount: 14900,
      currency: "INR",
      category_id: getCatId("Subscriptions"),
      description: "Spotify Premium Duo",
      merchant: "Spotify AB",
      frequency: "monthly",
      interval: 1,
      start_date: `${year}-01-22`,
      end_date: null,
      next_date: `${year}-10-22`,
      is_active: true,
      last_generated: `${year}-09-22`,
      created_at: SEED_TIMESTAMP,
      updated_at: SEED_TIMESTAMP,
    },
    {
      id: "rec-6",
      user_id: "demo-user",
      account_id: "acc-4",
      type: "expense",
      amount: 83000,
      currency: "INR",
      category_id: getCatId("Subscriptions"),
      description: "GitHub Copilot Developer Pro",
      merchant: "GitHub / Microsoft",
      frequency: "monthly",
      interval: 1,
      start_date: `${year}-02-25`,
      end_date: null,
      next_date: `${year}-10-25`,
      is_active: true,
      last_generated: `${year}-09-25`,
      created_at: SEED_TIMESTAMP,
      updated_at: SEED_TIMESTAMP,
    },
    {
      id: "rec-7",
      user_id: "demo-user",
      account_id: "acc-1",
      type: "expense",
      amount: 185000,
      currency: "INR",
      category_id: getCatId("Health"),
      description: "Cult.fit Elite Gym Membership",
      merchant: "Cult.fit",
      frequency: "monthly",
      interval: 1,
      start_date: `${year}-03-28`,
      end_date: null,
      next_date: `${year}-10-28`,
      is_active: true,
      last_generated: `${year}-09-28`,
      created_at: SEED_TIMESTAMP,
      updated_at: SEED_TIMESTAMP,
    },
    {
      id: "rec-8",
      user_id: "demo-user",
      account_id: "acc-1",
      type: "expense",
      amount: 117900,
      currency: "INR",
      category_id: getCatId("Bills"),
      description: "JioFiber Ultra Gigabit Internet",
      merchant: "Reliance Jio Infocomm",
      frequency: "monthly",
      interval: 1,
      start_date: `${year}-01-01`,
      end_date: null,
      next_date: `${year}-11-01`,
      is_active: true,
      last_generated: `${year}-10-01`,
      created_at: SEED_TIMESTAMP,
      updated_at: SEED_TIMESTAMP,
    },
    {
      id: "rec-9",
      user_id: "demo-user",
      account_id: "acc-4",
      type: "expense",
      amount: 149900,
      currency: "INR",
      category_id: getCatId("Subscriptions"),
      description: "Amazon Prime Annual Membership",
      merchant: "Amazon India",
      frequency: "yearly",
      interval: 1,
      start_date: `${year - 1}-12-15`,
      end_date: null,
      next_date: `${year}-12-15`,
      is_active: true,
      last_generated: `${year - 1}-12-15`,
      created_at: SEED_TIMESTAMP,
      updated_at: SEED_TIMESTAMP,
    },
  ];

  // In-app Notifications
  const notifications: Notification[] = [
    {
      id: "notif-1",
      user_id: "demo-user",
      type: "goal_milestone",
      title: "Goal Milestone Reached! 🎉",
      message: "You've crossed 70% of your Emergency Safety Net target. Outstanding discipline!",
      is_read: false,
      action_url: "/app/goals",
      created_at: "2026-10-14T08:00:00.000Z",
    },
    {
      id: "notif-2",
      user_id: "demo-user",
      type: "budget_warning",
      title: "Budget Alert: Shopping at 51.6%",
      message: "You have spent ₹6,200 of your ₹12,000 shopping budget limit for this month.",
      is_read: false,
      action_url: "/app/budgets",
      created_at: "2026-10-13T10:00:00.000Z",
    },
    {
      id: "notif-3",
      user_id: "demo-user",
      type: "monthly_summary",
      title: "Positive Net Cash Flow",
      message: "Your monthly savings rate is currently sitting at an impressive 61.4%.",
      is_read: true,
      action_url: "/app/analytics",
      created_at: "2026-10-12T10:00:00.000Z",
    },
  ];

  const profile: Profile = {
    id: "demo-user",
    email: "alex@fyza.finance",
    full_name: "Alex Varma",
    avatar_url: null,
    preferred_currency: "INR",
    locale: "en-IN",
    timezone: "Asia/Kolkata",
    week_start: "monday",
    date_format: "DD/MM/YYYY",
    onboarding_completed: true,
    created_at: new Date(year, month - 4, 1).toISOString(),
    updated_at: SEED_TIMESTAMP,
  };

  const preferences: UserPreferences = {
    id: "pref-1",
    user_id: "demo-user",
    notifications_enabled: true,
    budget_alerts: true,
    budget_alert_thresholds: [50, 75, 90, 100],
    recurring_reminders: true,
    goal_milestones: true,
    monthly_summaries: true,
    email_notifications: false,
    created_at: SEED_TIMESTAMP,
    updated_at: SEED_TIMESTAMP,
  };

  return {
    accounts,
    categories,
    transactions,
    budgets,
    goals,
    recurring,
    notifications,
    profile,
    preferences,
  };
}

// ============================================================
// CLIENT-SIDE STORAGE ENGINE (Hydration & Mutations)
// ============================================================

class FyzaStore {
  private isBrowser(): boolean {
    return typeof window !== "undefined";
  }

  // Initialize or fetch storage
  public init(): void {
    if (!this.isBrowser()) return;

    if (!localStorage.getItem(STORAGE_KEYS.ACCOUNTS)) {
      this.resetToDemo();
    }
  }

  public resetToDemo(): void {
    if (!this.isBrowser()) return;
    const seed = generateSeedData();
    localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(seed.accounts));
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(seed.categories));
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(seed.transactions));
    localStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(seed.budgets));
    localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(seed.goals));
    localStorage.setItem(STORAGE_KEYS.RECURRING, JSON.stringify(seed.recurring));
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(seed.notifications));
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(seed.profile));
    localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(seed.preferences));
    localStorage.removeItem(STORAGE_KEYS.RECURRING_OCCURRENCES);
    localStorage.removeItem(STORAGE_KEYS.NOTIFIED_BILLS);
    this.notifyChange();
  }

  public clearAllData(): void {
    if (!this.isBrowser()) return;
    localStorage.removeItem(STORAGE_KEYS.ACCOUNTS);
    localStorage.removeItem(STORAGE_KEYS.CATEGORIES);
    localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
    localStorage.removeItem(STORAGE_KEYS.BUDGETS);
    localStorage.removeItem(STORAGE_KEYS.GOALS);
    localStorage.removeItem(STORAGE_KEYS.RECURRING);
    localStorage.removeItem(STORAGE_KEYS.RECURRING_OCCURRENCES);
    localStorage.removeItem(STORAGE_KEYS.NOTIFIED_BILLS);
    localStorage.removeItem(STORAGE_KEYS.NOTIFICATIONS);
    this.notifyChange();
  }

  private notifyChange() {
    if (this.isBrowser()) {
      window.dispatchEvent(new Event("fyza_store_updated"));
    }
  }

  // --- ACCOUNTS ---
  public getAccounts(): Account[] {
    if (!this.isBrowser()) return generateSeedData().accounts;
    const raw = localStorage.getItem(STORAGE_KEYS.ACCOUNTS);
    if (!raw) return generateSeedData().accounts;
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  public saveAccount(account: Partial<Account> & { name: string; type: Account["type"] }): Account {
    const list = this.getAccounts();
    const now = new Date().toISOString();
    let updated: Account;

    if (account.id) {
      const index = list.findIndex((a) => a.id === account.id);
      if (index !== -1) {
        updated = { ...list[index], ...account, updated_at: now };
        list[index] = updated;
      } else {
        updated = {
          id: account.id,
          user_id: "current-user",
          currency: account.currency || "INR",
          opening_balance: account.opening_balance || 0,
          current_balance: account.current_balance || account.opening_balance || 0,
          description: account.description || null,
          is_archived: false,
          icon: account.icon || null,
          color: account.color || null,
          created_at: now,
          updated_at: now,
          ...account,
        };
        list.push(updated);
      }
    } else {
      updated = {
        id: `acc-${Date.now()}`,
        user_id: "current-user",
        name: account.name,
        type: account.type,
        currency: account.currency || "INR",
        opening_balance: account.opening_balance || 0,
        current_balance: account.opening_balance || 0,
        description: account.description || null,
        is_archived: false,
        icon: account.icon || null,
        color: account.color || null,
        created_at: now,
        updated_at: now,
      };
      list.push(updated);
    }

    if (this.isBrowser()) {
      localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(list));
      this.notifyChange();
    }
    return updated;
  }

  public deleteAccount(id: string): void {
    if (!this.isBrowser()) return;
    const list = this.getAccounts().filter((a) => a.id !== id);
    localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(list));
    this.notifyChange();
  }

  // --- CATEGORIES ---
  public getCategories(): Category[] {
    if (!this.isBrowser()) return generateSeedData().categories;
    const raw = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
    if (!raw) return generateSeedData().categories;
    try {
      return JSON.parse(raw);
    } catch {
      return generateSeedData().categories;
    }
  }

  public saveCategory(category: Partial<Category> & { name: string; type: Category["type"] }): Category {
    const list = this.getCategories();
    const now = new Date().toISOString();
    const newCat: Category = {
      icon: "Tag",
      color: "#48D6A0",
      is_default: false,
      parent_id: null,
      ...category,
      id: category.id || `cat-${Date.now()}`,
      user_id: "current-user",
      name: category.name,
      type: category.type,
      created_at: now,
    };

    const idx = list.findIndex((c) => c.id === newCat.id);
    if (idx !== -1) {
      list[idx] = newCat;
    } else {
      list.push(newCat);
    }

    if (this.isBrowser()) {
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(list));
      this.notifyChange();
    }
    return newCat;
  }

  // --- TRANSACTIONS ---
  public getTransactions(): Transaction[] {
    if (!this.isBrowser()) return generateSeedData().transactions;
    const raw = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    if (!raw) return generateSeedData().transactions;
    try {
      const txs: Transaction[] = JSON.parse(raw);
      const categories = this.getCategories();
      const accounts = this.getAccounts();

      // Join metadata
      return txs.map((t) => ({
        ...t,
        category: categories.find((c) => c.id === t.category_id),
        account: accounts.find((a) => a.id === t.account_id),
      }));
    } catch {
      return [];
    }
  }

  public saveTransaction(
    tx: Partial<Transaction> & {
      account_id: string;
      type: Transaction["type"];
      amount: number;
      description: string;
      transaction_date: string;
    }
  ): Transaction {
    const transactions = this.getTransactions();
    const accounts = this.getAccounts();
    const now = new Date().toISOString();

    let updatedTx: Transaction;

    if (tx.id) {
      const oldIdx = transactions.findIndex((t) => t.id === tx.id);
      if (oldIdx !== -1) {
        const oldTx = transactions[oldIdx];
        // Reverse old transaction impact on account balance
        const accIdx = accounts.findIndex((a) => a.id === oldTx.account_id);
        if (accIdx !== -1) {
          if (oldTx.type === "income") accounts[accIdx].current_balance -= oldTx.amount;
          else if (oldTx.type === "expense") accounts[accIdx].current_balance += oldTx.amount;
          else if (oldTx.type === "transfer" && oldTx.transfer_account_id) {
            accounts[accIdx].current_balance += oldTx.amount;
            const destIdx = accounts.findIndex((a) => a.id === oldTx.transfer_account_id);
            if (destIdx !== -1) accounts[destIdx].current_balance -= oldTx.amount;
          }
        }

        updatedTx = {
          ...oldTx,
          ...tx,
          tags: tx.tags || oldTx.tags || [],
          updated_at: now,
        };
        transactions[oldIdx] = updatedTx;
      } else {
        updatedTx = {
          id: tx.id,
          user_id: "current-user",
          currency: tx.currency || "INR",
          category_id: tx.category_id || null,
          merchant: tx.merchant || null,
          notes: tx.notes || null,
          tags: tx.tags || [],
          is_recurring: tx.is_recurring ?? Boolean(tx.recurring_id),
          recurring_id: tx.recurring_id || null,
          transfer_account_id: tx.transfer_account_id || null,
          created_at: now,
          updated_at: now,
          ...tx,
        };
        transactions.unshift(updatedTx);
      }
    } else {
      updatedTx = {
        id: `tx-${Date.now()}`,
        user_id: "current-user",
        account_id: tx.account_id,
        type: tx.type,
        amount: Math.round(tx.amount), // ensure integer minor units
        currency: tx.currency || "INR",
        category_id: tx.category_id || null,
        description: tx.description,
        transaction_date: tx.transaction_date,
        merchant: tx.merchant || null,
        notes: tx.notes || null,
        tags: tx.tags || [],
        is_recurring: tx.is_recurring ?? Boolean(tx.recurring_id),
        recurring_id: tx.recurring_id || null,
        transfer_account_id: tx.transfer_account_id || null,
        created_at: now,
        updated_at: now,
      };
      transactions.unshift(updatedTx);
    }

    // Apply new transaction balance impact atomically
    const sourceAccIdx = accounts.findIndex((a) => a.id === updatedTx.account_id);
    if (sourceAccIdx !== -1) {
      if (updatedTx.type === "income") {
        accounts[sourceAccIdx].current_balance += updatedTx.amount;
      } else if (updatedTx.type === "expense") {
        accounts[sourceAccIdx].current_balance -= updatedTx.amount;
      } else if (updatedTx.type === "transfer" && updatedTx.transfer_account_id) {
        accounts[sourceAccIdx].current_balance -= updatedTx.amount;
        const targetAccIdx = accounts.findIndex((a) => a.id === updatedTx.transfer_account_id);
        if (targetAccIdx !== -1) {
          accounts[targetAccIdx].current_balance += updatedTx.amount;
        }
      }
    }

    if (this.isBrowser()) {
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
      localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));
      this.notifyChange();
    }

    return updatedTx;
  }

  public deleteTransaction(id: string): void {
    if (!this.isBrowser()) return;
    const transactions = this.getTransactions();
    const accounts = this.getAccounts();
    const tx = transactions.find((t) => t.id === id);

    if (tx) {
      // Reverse balance change
      const accIdx = accounts.findIndex((a) => a.id === tx.account_id);
      if (accIdx !== -1) {
        if (tx.type === "income") accounts[accIdx].current_balance -= tx.amount;
        else if (tx.type === "expense") accounts[accIdx].current_balance += tx.amount;
        else if (tx.type === "transfer" && tx.transfer_account_id) {
          accounts[accIdx].current_balance += tx.amount;
          const destIdx = accounts.findIndex((a) => a.id === tx.transfer_account_id);
          if (destIdx !== -1) accounts[destIdx].current_balance -= tx.amount;
        }
      }
      const updated = transactions.filter((t) => t.id !== id);
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(updated));
      localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));
      this.notifyChange();
    }
  }

  // --- BUDGETS ---
  public getBudgets(): Budget[] {
    if (!this.isBrowser()) return generateSeedData().budgets;
    const raw = localStorage.getItem(STORAGE_KEYS.BUDGETS);
    if (!raw) return generateSeedData().budgets;
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  public saveBudget(budget: Partial<Budget> & { name: string; total_limit: number; month: number; year: number }): Budget {
    const list = this.getBudgets();
    const now = new Date().toISOString();
    let updated: Budget;

    if (budget.id) {
      const idx = list.findIndex((b) => b.id === budget.id);
      if (idx !== -1) {
        updated = { ...list[idx], ...budget, updated_at: now };
        list[idx] = updated;
      } else {
        updated = {
          id: budget.id,
          user_id: "current-user",
          is_active: true,
          created_at: now,
          updated_at: now,
          ...budget,
        };
        list.push(updated);
      }
    } else {
      updated = {
        id: `bud-${Date.now()}`,
        user_id: "current-user",
        name: budget.name,
        month: budget.month,
        year: budget.year,
        total_limit: Math.round(budget.total_limit),
        is_active: true,
        categories: budget.categories || [],
        created_at: now,
        updated_at: now,
      };
      list.push(updated);
    }

    if (this.isBrowser()) {
      localStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(list));
      this.notifyChange();
    }
    return updated;
  }

  public updateBudgetCategoryLimit(budgetId: string, categoryId: string, newLimitMinor: number): void {
    if (!this.isBrowser()) return;
    const budgets = this.getBudgets();
    const b = budgets.find((item) => item.id === budgetId);
    if (b && b.categories) {
      const cat = b.categories.find((c) => c.category_id === categoryId);
      if (cat) {
        cat.limit_amount = Math.round(newLimitMinor);
        b.total_limit = b.categories.reduce((acc, curr) => acc + curr.limit_amount, 0);
        b.updated_at = new Date().toISOString();
        localStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(budgets));
        this.notifyChange();
      }
    }
  }

  // --- GOALS ---
  public getGoals(): Goal[] {
    if (!this.isBrowser()) return generateSeedData().goals;
    const raw = localStorage.getItem(STORAGE_KEYS.GOALS);
    if (!raw) return generateSeedData().goals;
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  public saveGoal(goal: Partial<Goal> & { name: string; target_amount: number; category: Goal["category"] }): Goal {
    const list = this.getGoals();
    const now = new Date().toISOString();
    let updated: Goal;

    if (goal.id) {
      const idx = list.findIndex((g) => g.id === goal.id);
      if (idx !== -1) {
        updated = { ...list[idx], ...goal, updated_at: now };
        list[idx] = updated;
      } else {
        updated = {
          id: goal.id,
          user_id: "current-user",
          current_amount: goal.current_amount || 0,
          target_date: goal.target_date || null,
          description: goal.description || null,
          icon: goal.icon || null,
          color: goal.color || null,
          status: goal.status || "active",
          created_at: now,
          updated_at: now,
          ...goal,
        };
        list.push(updated);
      }
    } else {
      updated = {
        id: `goal-${Date.now()}`,
        user_id: "current-user",
        name: goal.name,
        target_amount: Math.round(goal.target_amount),
        current_amount: Math.round(goal.current_amount || 0),
        target_date: goal.target_date || null,
        category: goal.category,
        description: goal.description || null,
        icon: goal.icon || null,
        color: goal.color || null,
        status: "active",
        created_at: now,
        updated_at: now,
      };
      list.push(updated);
    }

    if (this.isBrowser()) {
      localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(list));
      this.notifyChange();
    }
    return updated;
  }

  public contributeToGoal(goalId: string, amountMinor: number, note?: string): void {
    if (!this.isBrowser()) return;
    const goals = this.getGoals();
    const idx = goals.findIndex((g) => g.id === goalId);
    if (idx !== -1) {
      goals[idx].current_amount += Math.round(amountMinor);
      if (goals[idx].current_amount >= goals[idx].target_amount) {
        goals[idx].status = "completed";
      }
      goals[idx].updated_at = new Date().toISOString();
      localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(goals));
      this.notifyChange();
    }
  }

  public deleteGoal(id: string): void {
    if (!this.isBrowser()) return;
    const list = this.getGoals().filter((g) => g.id !== id);
    localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(list));
    this.notifyChange();
  }

  // --- RECURRING TRANSACTIONS & SUBSCRIPTIONS ---
  public getRecurring(): RecurringTransaction[] {
    if (!this.isBrowser()) return generateSeedData().recurring;
    const raw = localStorage.getItem(STORAGE_KEYS.RECURRING);
    if (!raw) return generateSeedData().recurring;
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  public getRecurringTransactions(): RecurringTransaction[] {
    return this.getRecurring();
  }

  public getRecurringOccurrences(): string[] {
    if (!this.isBrowser()) return [];
    const raw = localStorage.getItem(STORAGE_KEYS.RECURRING_OCCURRENCES);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  public getNotifiedBillKeys(): string[] {
    if (!this.isBrowser()) return [];
    const raw = localStorage.getItem(STORAGE_KEYS.NOTIFIED_BILLS);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  public toggleRecurring(id: string): void {
    if (!this.isBrowser()) return;
    const list = this.getRecurring();
    const item = list.find((r) => r.id === id);
    if (item) {
      item.is_active = !item.is_active;
      item.status = item.is_active ? "active" : "paused";
      item.updated_at = new Date().toISOString();
      localStorage.setItem(STORAGE_KEYS.RECURRING, JSON.stringify(list));
      this.notifyChange();
    }
  }

  public pauseRecurring(id: string): void {
    if (!this.isBrowser()) return;
    const list = this.getRecurring();
    const item = list.find((r) => r.id === id);
    if (item) {
      item.is_active = false;
      item.status = "paused";
      item.updated_at = new Date().toISOString();
      localStorage.setItem(STORAGE_KEYS.RECURRING, JSON.stringify(list));
      this.notifyChange();
    }
  }

  public resumeRecurring(id: string): void {
    if (!this.isBrowser()) return;
    const list = this.getRecurring();
    const item = list.find((r) => r.id === id);
    if (item) {
      item.is_active = true;
      item.status = "active";
      item.updated_at = new Date().toISOString();
      localStorage.setItem(STORAGE_KEYS.RECURRING, JSON.stringify(list));
      this.notifyChange();
    }
  }

  public cancelRecurring(id: string): void {
    if (!this.isBrowser()) return;
    const list = this.getRecurring();
    const item = list.find((r) => r.id === id);
    if (item) {
      item.is_active = false;
      item.status = "cancelled";
      item.updated_at = new Date().toISOString();
      localStorage.setItem(STORAGE_KEYS.RECURRING, JSON.stringify(list));
      this.notifyChange();
    }
  }

  public archiveRecurring(id: string): void {
    if (!this.isBrowser()) return;
    const list = this.getRecurring();
    const item = list.find((r) => r.id === id);
    if (item) {
      item.is_active = false;
      item.status = "archived";
      item.updated_at = new Date().toISOString();
      localStorage.setItem(STORAGE_KEYS.RECURRING, JSON.stringify(list));
      this.notifyChange();
    }
  }

  public addRecurring(
    data: Omit<RecurringTransaction, "id" | "user_id" | "created_at" | "updated_at">
  ): RecurringTransaction {
    const list = this.getRecurring();
    const now = new Date().toISOString();
    const item: RecurringTransaction = {
      ...data,
      id: `rec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      user_id: "demo-user",
      status: data.status || (data.is_active ? "active" : "paused"),
      created_at: now,
      updated_at: now,
    };
    if (this.isBrowser()) {
      localStorage.setItem(STORAGE_KEYS.RECURRING, JSON.stringify([item, ...list]));
      this.notifyChange();
    }
    return item;
  }

  public updateRecurring(item: RecurringTransaction): void {
    if (!this.isBrowser()) return;
    const list = this.getRecurring().map((r) =>
      r.id === item.id
        ? {
            ...item,
            status: item.status || (item.is_active ? "active" : "paused"),
            is_active: item.status ? item.status === "active" : item.is_active,
            updated_at: new Date().toISOString(),
          }
        : r
    );
    localStorage.setItem(STORAGE_KEYS.RECURRING, JSON.stringify(list));
    this.notifyChange();
  }

  public deleteRecurring(id: string): void {
    if (!this.isBrowser()) return;
    const list = this.getRecurring().filter((r) => r.id !== id);
    localStorage.setItem(STORAGE_KEYS.RECURRING, JSON.stringify(list));
    this.notifyChange();
  }

  /**
   * Idempotently record a payment occurrence for a recurring transaction.
   * Creates an actual linked Transaction, adjusts account balance, advances next_date,
   * logs the occurrence, and triggers an in-app confirmation notification.
   */
  public recordRecurringPayment(
    id: string,
    options?: { paymentDate?: string; accountId?: string }
  ): { success: boolean; transaction?: Transaction; error?: string } {
    if (!this.isBrowser()) return { success: false, error: "Store not initialized in browser" };
    const list = this.getRecurring();
    const item = list.find((r) => r.id === id);
    if (!item) return { success: false, error: "Subscription not found" };

    const occurrences = this.getRecurringOccurrences();
    const occurrenceKey = `${item.id}_${item.next_date}`;
    if (occurrences.includes(occurrenceKey)) {
      return { success: false, error: "Payment already recorded for this billing cycle." };
    }

    const paymentDate = options?.paymentDate || item.next_date;
    const accountId = options?.accountId || item.account_id;

    // Record the actual transaction in the ledger
    const tx = this.saveTransaction({
      account_id: accountId,
      type: item.type,
      amount: item.amount,
      currency: item.currency,
      category_id: item.category_id,
      description: `${item.description} Renewal`,
      merchant: item.merchant,
      transaction_date: paymentDate,
      is_recurring: true,
      recurring_id: item.id,
      notes: `Subscription payment recorded via Fyza Subscription Engine on ${paymentDate}.`,
    });

    // Advance next renewal date safely
    const nextDate = calculateNextBillingDate(item.next_date, item.frequency, item.interval);
    item.last_paid_date = paymentDate;
    item.last_transaction_id = tx.id;
    item.last_generated = paymentDate;
    item.next_date = nextDate;
    item.updated_at = new Date().toISOString();

    // Save occurrence key to guarantee idempotency across reloads
    occurrences.push(occurrenceKey);
    localStorage.setItem(STORAGE_KEYS.RECURRING_OCCURRENCES, JSON.stringify(occurrences));
    localStorage.setItem(STORAGE_KEYS.RECURRING, JSON.stringify(list));

    // Send confirmation in-app notification
    this.addNotification({
      type: "recurring_reminder",
      title: `Payment Logged: ${item.description}`,
      message: `Recorded payment of ${formatCurrency(item.amount, item.currency)}. Next renewal is scheduled for ${nextDate}.`,
      action_url: "/app/subscriptions",
    });

    this.notifyChange();
    return { success: true, transaction: tx };
  }

  public recordRecurringMissed(id: string): void {
    if (!this.isBrowser()) return;
    const list = this.getRecurring();
    const item = list.find((r) => r.id === id);
    if (!item) return;

    this.addNotification({
      type: "recurring_reminder",
      title: `Payment Attention: ${item.description}`,
      message: `Renewal payment of ${formatCurrency(item.amount, item.currency)} scheduled for ${item.next_date} requires your attention.`,
      action_url: "/app/subscriptions",
    });
    this.notifyChange();
  }

  /**
   * Idempotently scans active recurring items and emits in-app bill reminders
   * without creating duplicate notifications on refresh.
   */
  public syncBillReminders(): Notification[] {
    if (!this.isBrowser()) return [];
    const recurring = this.getRecurring().filter(
      (r) => r.is_active && (r.status === "active" || !r.status) && r.type === "expense"
    );
    const notifiedKeys = this.getNotifiedBillKeys();
    const todayStr = new Date().toISOString().split("T")[0];
    const today = new Date(todayStr + "T00:00:00");
    const createdNotifs: Notification[] = [];

    recurring.forEach((item) => {
      const leadDays = item.reminder_days_before || 3;
      const dueDate = new Date(item.next_date + "T00:00:00");
      const diffTime = dueDate.getTime() - today.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= leadDays) {
        const notifKey = `bill_notif_${item.id}_${item.next_date}`;
        if (!notifiedKeys.includes(notifKey)) {
          let title = `Upcoming Bill: ${item.description}`;
          let message = `${item.description} (${formatCurrency(item.amount, item.currency)}) is due in ${diffDays} day${diffDays === 1 ? "" : "s"} on ${item.next_date}.`;

          if (diffDays === 0) {
            title = `Due Today: ${item.description}`;
            message = `${item.description} (${formatCurrency(item.amount, item.currency)}) is due today (${item.next_date}).`;
          } else if (diffDays < 0) {
            title = `Overdue Bill: ${item.description}`;
            message = `${item.description} was due on ${item.next_date} (${Math.abs(diffDays)} days ago). Please verify payment status.`;
          }

          const newNotif = this.addNotification({
            type: "recurring_reminder",
            title,
            message,
            action_url: "/app/subscriptions",
          });

          notifiedKeys.push(notifKey);
          createdNotifs.push(newNotif);
        }
      }
    });

    if (createdNotifs.length > 0) {
      localStorage.setItem(STORAGE_KEYS.NOTIFIED_BILLS, JSON.stringify(notifiedKeys));
    }

    return createdNotifs;
  }

  // --- NOTIFICATIONS ---
  public getNotifications(): Notification[] {
    if (!this.isBrowser()) return generateSeedData().notifications;
    const raw = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    if (!raw) return generateSeedData().notifications;
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  public addNotification(
    data: Omit<Notification, "id" | "user_id" | "is_read" | "created_at">
  ): Notification {
    const list = this.getNotifications();
    const notif: Notification = {
      ...data,
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      user_id: "demo-user",
      is_read: false,
      created_at: new Date().toISOString(),
    };
    if (this.isBrowser()) {
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify([notif, ...list]));
      this.notifyChange();
    }
    return notif;
  }

  public markNotificationRead(id: string): void {
    if (!this.isBrowser()) return;
    const list = this.getNotifications();
    const item = list.find((n) => n.id === id);
    if (item) {
      item.is_read = true;
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(list));
      this.notifyChange();
    }
  }

  public markAllNotificationsRead(): void {
    if (!this.isBrowser()) return;
    const list = this.getNotifications().map((n) => ({ ...n, is_read: true }));
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(list));
    this.notifyChange();
  }

  // --- FINANCIAL CALENDAR EVENT AGGREGATION ---
  public getCalendarEvents(params: {
    year: number;
    month: number; // 1-12
    eventTypes?: CalendarEventType[];
    categoryId?: string;
  }): CalendarEvent[] {
    const { year, month, eventTypes, categoryId } = params;
    const categories = this.getCategories();
    const accounts = this.getAccounts();
    const recurring = this.getRecurring();
    const transactions = this.getTransactions();
    const goals = this.getGoals();

    const events: CalendarEvent[] = [];
    const monthStr = String(month).padStart(2, "0");
    const monthStart = `${year}-${monthStr}-01`;
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const monthEnd = `${year}-${monthStr}-${String(daysInMonth).padStart(2, "0")}`;
    const todayStr = typeof window !== "undefined" ? new Date().toISOString().split("T")[0] : "2026-10-15";

    const shouldInclude = (type: CalendarEventType) => {
      if (!eventTypes || eventTypes.length === 0) return true;
      return eventTypes.includes(type);
    };

    // 1. Recurring Subscriptions and Bills
    recurring.forEach((item) => {
      if (categoryId && item.category_id !== categoryId) return;
      const cat = categories.find((c) => c.id === item.category_id);
      const acc = accounts.find((a) => a.id === item.account_id);
      const status = item.status || (item.is_active ? "active" : "paused");

      const isSub =
        item.type === "expense" &&
        (cat?.name.toLowerCase().includes("subscript") ||
          item.frequency === "monthly" ||
          item.frequency === "yearly");
      const eventType: CalendarEventType =
        item.type === "income" ? "expected_income" : isSub ? "subscription" : "recurring_bill";

      if (!shouldInclude(eventType)) return;

      // Project next_date or occurrences in the requested month
      if (item.next_date >= monthStart && item.next_date <= monthEnd) {
        const isOverdue = item.next_date < todayStr && status === "active";

        events.push({
          id: `cal-rec-${item.id}-${item.next_date}`,
          date: item.next_date,
          type: eventType,
          title: item.description,
          amount: item.amount,
          currency: item.currency,
          status: status === "paused" ? "paused" : isOverdue ? "overdue" : "planned",
          category: cat,
          account: acc,
          sourceId: item.id,
          merchant: item.merchant,
          notes: item.notes,
          cancellation_url: item.cancellation_url,
          isOverdue,
        });
      }
    });

    // 2. Completed Transactions
    if (shouldInclude("completed_transaction")) {
      transactions.forEach((tx) => {
        if (tx.transaction_date >= monthStart && tx.transaction_date <= monthEnd) {
          if (categoryId && tx.category_id !== categoryId) return;
          const cat = categories.find((c) => c.id === tx.category_id);
          const acc = accounts.find((a) => a.id === tx.account_id);

          events.push({
            id: `cal-tx-${tx.id}`,
            date: tx.transaction_date,
            type: "completed_transaction",
            title: tx.description,
            amount: tx.amount,
            currency: tx.currency,
            status: "completed",
            category: cat,
            account: acc,
            sourceId: tx.id,
            merchant: tx.merchant,
            notes: tx.notes,
          });
        }
      });
    }

    // 3. Savings Goal Milestones & Deadlines
    if (shouldInclude("goal_deadline")) {
      goals.forEach((goal) => {
        if (goal.target_date && goal.target_date >= monthStart && goal.target_date <= monthEnd) {
          events.push({
            id: `cal-goal-${goal.id}`,
            date: goal.target_date,
            type: "goal_deadline",
            title: `Goal Target: ${goal.name}`,
            amount: goal.target_amount,
            currency: "INR",
            status: goal.current_amount >= goal.target_amount ? "completed" : "planned",
            sourceId: goal.id,
            notes: `Progress: ${Math.round((goal.current_amount / goal.target_amount) * 100)}% achieved`,
          });
        }
      });
    }

    // Sort events by date ascending
    events.sort((a, b) => a.date.localeCompare(b.date));
    return events;
  }

  // --- PROFILE & PREFERENCES ---
  public getProfile(): Profile {
    if (!this.isBrowser()) return generateSeedData().profile;
    const raw = localStorage.getItem(STORAGE_KEYS.PROFILE);
    if (!raw) return generateSeedData().profile;
    try {
      return JSON.parse(raw);
    } catch {
      return generateSeedData().profile;
    }
  }

  public updateProfile(data: Partial<Profile>): Profile {
    const current = this.getProfile();
    const updated = { ...current, ...data, updated_at: new Date().toISOString() };
    if (this.isBrowser()) {
      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(updated));
      this.notifyChange();
    }
    return updated;
  }

  public getPreferences(): UserPreferences {
    if (!this.isBrowser()) return generateSeedData().preferences;
    const raw = localStorage.getItem(STORAGE_KEYS.PREFERENCES);
    if (!raw) return generateSeedData().preferences;
    try {
      return JSON.parse(raw);
    } catch {
      return generateSeedData().preferences;
    }
  }

  public updatePreferences(data: Partial<UserPreferences>): UserPreferences {
    const current = this.getPreferences();
    const updated = { ...current, ...data, updated_at: new Date().toISOString() };
    if (this.isBrowser()) {
      localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(updated));
      this.notifyChange();
    }
    return updated;
  }

  // --- DATA EXPORT / IMPORT ---
  public exportData(): string {
    const payload = {
      version: "1.0",
      exported_at: new Date().toISOString(),
      profile: this.getProfile(),
      accounts: this.getAccounts(),
      categories: this.getCategories(),
      transactions: this.getTransactions(),
      budgets: this.getBudgets(),
      goals: this.getGoals(),
      recurring: this.getRecurring(),
    };
    return JSON.stringify(payload, null, 2);
  }

  public importData(jsonString: string): { success: boolean; error?: string } {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed.accounts || !parsed.transactions) {
        return { success: false, error: "Invalid Fyza backup format" };
      }
      if (this.isBrowser()) {
        if (parsed.accounts) localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(parsed.accounts));
        if (parsed.transactions) localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(parsed.transactions));
        if (parsed.categories) localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(parsed.categories));
        if (parsed.budgets) localStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(parsed.budgets));
        if (parsed.goals) localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(parsed.goals));
        if (parsed.profile) localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(parsed.profile));
        this.notifyChange();
      }
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: (err as Error).message };
    }
  }
}

export const fyzaStore = new FyzaStore();
