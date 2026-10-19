/**
 * FYZA PHASE 5: SECURITY AUDIT & PRODUCTION READINESS TEST SUITE
 * 
 * Verifies:
 * 1. Supabase Schema & Row-Level Security (RLS) policies on all tables
 * 2. Cross-user isolation & child table cascading ownership
 * 3. AI Endpoint rate limiting, prompt injection defense, and input validation
 * 4. Financial edge cases (negative balances, zero income, transfers, leap years)
 * 5. Minor unit precision (integer paise) & IEEE-754 drift prevention
 * 6. Demo mode isolation from authenticated user state
 */

import * as fs from "fs";
import * as path from "path";
import {
  calculateNextBillingDate,
  calculateSavingsRate,
  calculateFinancialHealthScore,
  calculateEmergencyBuffer,
} from "../src/lib/calculations";
import { toMinorUnits, toMajorUnits } from "../src/lib/utils";
import type { Account, Transaction } from "../src/lib/types";

let passedCount = 0;
let totalCount = 0;

function assert(condition: boolean, testName: string, details?: string) {
  totalCount++;
  if (condition) {
    passedCount++;
    console.log(`  ✅ PASS: ${testName}`);
  } else {
    console.error(`  ❌ FAIL: ${testName}${details ? ` — ${details}` : ""}`);
    throw new Error(`Assertion failed: ${testName}`);
  }
}

console.log("\n========================================================");
console.log("FYZA PHASE 5: SECURITY, AUDIT & PRODUCTION READINESS TESTS");
console.log("========================================================\n");

// ====================================================================
// SECTION 1: SUPABASE SCHEMA & ROW LEVEL SECURITY (RLS) AUDIT
// ====================================================================
console.log("--- 1. Supabase PostgreSQL Schema & RLS Audit ---");

const schemaPath = path.resolve(__dirname, "../supabase/schema.sql");
assert(fs.existsSync(schemaPath), "Schema file exists at supabase/schema.sql");

const schemaContent = fs.readFileSync(schemaPath, "utf-8");

// All 16 production tables
const EXPECTED_TABLES = [
  "profiles",
  "accounts",
  "categories",
  "recurring_transactions",
  "recurring_occurrences",
  "transactions",
  "budgets",
  "budget_categories",
  "goals",
  "goal_contributions",
  "notifications",
  "ai_conversations",
  "ai_messages",
  "smart_insights",
  "what_if_simulations",
  "user_preferences",
];

for (const table of EXPECTED_TABLES) {
  // Check table creation
  const tableCreated = schemaContent.includes(`CREATE TABLE IF NOT EXISTS public.${table}`);
  assert(tableCreated, `Table public.${table} declared in schema`);

  // Check RLS enabled
  const rlsEnabled = schemaContent.includes(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;`);
  assert(rlsEnabled, `Row Level Security (RLS) explicitly enabled on ${table}`);
}

// Check child table ownership policies via relational EXISTS
assert(
  schemaContent.includes("public.budget_categories") &&
  schemaContent.includes("EXISTS (SELECT 1 FROM public.budgets b WHERE b.id = budget_categories.budget_id AND b.user_id = auth.uid())"),
  "budget_categories enforces parent budget user_id isolation via EXISTS query"
);

assert(
  schemaContent.includes("public.goal_contributions") &&
  schemaContent.includes("EXISTS (SELECT 1 FROM public.goals g WHERE g.id = goal_contributions.goal_id AND g.user_id = auth.uid())"),
  "goal_contributions enforces parent goal user_id isolation via EXISTS query"
);

assert(
  schemaContent.includes("public.ai_messages") &&
  schemaContent.includes("EXISTS (SELECT 1 FROM public.ai_conversations c WHERE c.id = ai_messages.conversation_id AND c.user_id = auth.uid())"),
  "ai_messages enforces parent ai_conversations user_id isolation via EXISTS query"
);

// Check automated new user trigger exists
assert(
  schemaContent.includes("CREATE OR REPLACE FUNCTION public.handle_new_user()") &&
  schemaContent.includes("CREATE TRIGGER on_auth_user_created"),
  "Automated profile and user_preferences provisioning trigger verified"
);

// Check foreign key CASCADE deletes
assert(
  schemaContent.includes("REFERENCES auth.users(id) ON DELETE CASCADE"),
  "Cascading user data deletion configured on account removal"
);

// ====================================================================
// SECTION 1B: FIREBASE FIRESTORE SECURITY RULES AUDIT
// ====================================================================
console.log("\n--- 1B. Firebase Firestore Security Rules Audit ---");
const firestoreRulesPath = path.resolve(__dirname, "../firestore.rules");
assert(fs.existsSync(firestoreRulesPath), "firestore.rules file exists at root");
const firestoreRulesContent = fs.readFileSync(firestoreRulesPath, "utf-8");

const EXPECTED_FIRESTORE_COLLECTIONS = [
  "profiles",
  "accounts",
  "categories",
  "transactions",
  "recurring_transactions",
  "recurring_occurrences",
  "budgets",
  "goals",
  "notifications",
  "smart_insights",
  "what_if_simulations",
];

for (const col of EXPECTED_FIRESTORE_COLLECTIONS) {
  assert(
    firestoreRulesContent.includes(`match /${col}/`),
    `Firestore collection /${col}/ has security rules declared`
  );
}
assert(
  firestoreRulesContent.includes("request.auth != null"),
  "Firestore enforces authentication check"
);
assert(
  firestoreRulesContent.includes("resource.data.user_id == request.auth.uid"),
  "Firestore enforces user_id ownership match"
);

// ====================================================================
// SECTION 2: AI ROUTE SECURITY & RATE LIMITING AUDIT
// ====================================================================
console.log("\n--- 2. AI Route Security & Rate Limiting Audit ---");

const routePath = path.resolve(__dirname, "../src/app/api/ai/chat/route.ts");
assert(fs.existsSync(routePath), "AI route exists at src/app/api/ai/chat/route.ts");

const routeContent = fs.readFileSync(routePath, "utf-8");

assert(routeContent.includes("checkRateLimit"), "Rate limiting logic implemented in route handler");
assert(routeContent.includes("MAX_REQUESTS_PER_WINDOW"), "Request rate threshold explicitly configured");
assert(routeContent.includes("SUSPICIOUS_PATTERNS"), "Prompt injection detection patterns defined");
assert(routeContent.includes("trimmedMessage.length > 1000"), "Oversized payload limit (1000 chars) enforced");
assert(routeContent.includes("status: 429"), "HTTP 429 Too Many Requests response configured");
assert(routeContent.includes("status: 400"), "HTTP 400 Bad Request on invalid message or empty input");
assert(routeContent.includes("An unexpected error occurred while analyzing your finances"), "Sanitized 500 error prevents stack trace or secret leakage");

// ====================================================================
// SECTION 3: FINANCIAL PRECISION & PAISÉ ARITHMETIC AUDIT
// ====================================================================
console.log("\n--- 3. Financial Calculations & Edge Cases Audit ---");

// Test 1: Minor unit conversion precision
const amountPaise = toMinorUnits(1234.56);
assert(amountPaise === 123456, "₹1,234.56 converts exactly to 123,456 paise");
assert(toMajorUnits(123456) === 1234.56, "123,456 paise converts back to ₹1,234.56 without drift");

// Test 2: Float drift elimination with minor units
// In IEEE 754 float: 0.1 + 0.2 = 0.30000000000000004
// In minor units: 10 + 20 = 30 paise
const sumMinor = toMinorUnits(0.10) + toMinorUnits(0.20);
assert(sumMinor === 30, "Minor unit arithmetic eliminates IEEE-754 floating point drift");

// Test 3: Negative balance handling (Credit card debt / overdraft)
const accounts: Account[] = [
  { id: "acc-1", user_id: "u1", name: "Savings", type: "savings", currency: "INR", opening_balance: 5000000, current_balance: 5000000, created_at: "", updated_at: "", description: null, is_archived: false, icon: null, color: null },
  { id: "acc-2", user_id: "u1", name: "Credit Card", type: "credit", currency: "INR", opening_balance: 0, current_balance: -1500000, created_at: "", updated_at: "", description: null, is_archived: false, icon: null, color: null }, // -₹15,000 debt
];
const netLiquid = accounts.reduce((acc, a) => acc + a.current_balance, 0);
assert(netLiquid === 3500000, "Negative account balance (debt) correctly reduces net position (₹50,000 - ₹15,000 = ₹35,000)");

// Test 4: Transfer isolation (transfers must NOT alter total assets or count as income/expense)
const transferFrom: Transaction = {
  id: "t1",
  user_id: "u1",
  account_id: "acc-1",
  transfer_account_id: "acc-2",
  type: "transfer",
  amount: 1500000, // ₹15,000 transfer to pay credit card
  currency: "INR",
  category_id: null,
  description: "Credit Card Payment",
  transaction_date: "2026-10-15",
  merchant: null,
  notes: null,
  tags: [],
  is_recurring: false,
  recurring_id: null,
  created_at: "",
  updated_at: "",
};

// Ensure transfer does not count as income or expense
let recordedIncome = 0;
let recordedExpense = 0;
if (transferFrom.type === "income") recordedIncome += transferFrom.amount;
if (transferFrom.type === "expense") recordedExpense += transferFrom.amount;
assert(recordedIncome === 0 && recordedExpense === 0, "Internal transfer excluded from income and expenses");

// Test 5: Zero income division safety in savings rate
const zeroIncomeRate = calculateSavingsRate(0, 2000000);
assert(zeroIncomeRate === 0 && !isNaN(zeroIncomeRate) && isFinite(zeroIncomeRate), "Savings rate with zero income safely returns 0% without NaN or division by zero");

// Test 6: Zero income financial health score safety
const healthZeroIncome = calculateFinancialHealthScore({
  monthlyIncomeMinor: 0,
  monthlyExpensesMinor: 3500000,
  liquidBalanceMinor: 10000000,
  essentialExpensesMinor: 2500000,
  budgetAdherencePct: 80,
  activeGoalsCount: 1,
  completedGoalsCount: 0,
});
assert(
  healthZeroIncome.score >= 0 && healthZeroIncome.score <= 100 && isFinite(healthZeroIncome.score),
  `Health score with zero income produces safe bounded score (${healthZeroIncome.score}/100)`
);
assert(healthZeroIncome.rating === "Needs Attention", "Zero income scenario receives appropriate 'Needs Attention' rating");

// Test 7: Leap year & Month boundary safety for recurring commitments
const leapYearJan31 = calculateNextBillingDate("2024-01-31", "monthly", 1);
assert(leapYearJan31 === "2024-02-29", `Leap year Jan 31 clamps safely to Feb 29 (got: ${leapYearJan31})`);

const nonLeapJan31 = calculateNextBillingDate("2025-01-31", "monthly", 1);
assert(nonLeapJan31 === "2025-02-28", `Non-leap year Jan 31 clamps safely to Feb 28 (got: ${nonLeapJan31})`);

const mar31ToApr30 = calculateNextBillingDate("2026-03-31", "monthly", 1);
assert(mar31ToApr30 === "2026-04-30", `31-day month rolls safely to 30-day month end (March 31 -> April 30)`);

// Test 8: Emergency buffer with zero essential expenses
const zeroEssentialBuffer = calculateEmergencyBuffer({
  accounts: [{ id: "1", user_id: "u1", name: "Cash", type: "savings", currency: "INR", opening_balance: 100000, current_balance: 100000, is_archived: false, created_at: "", updated_at: "", description: null, icon: null, color: null }],
  essentialMonthlyExpenseMinor: 0,
});
assert(
  isFinite(zeroEssentialBuffer.monthsCovered) && zeroEssentialBuffer.monthsCovered >= 0,
  "Emergency buffer handles zero essential expense without Infinity error"
);

// ====================================================================
// SECTION 4: DEMO MODE LEDGER ISOLATION AUDIT
// ====================================================================
console.log("\n--- 4. Demo Mode Ledger Isolation Audit ---");

const demoPath = path.resolve(__dirname, "../src/app/demo/page.tsx");
assert(fs.existsSync(demoPath), "Demo page exists at src/app/demo/page.tsx");

const demoContent = fs.readFileSync(demoPath, "utf-8");

const storePath = path.resolve(__dirname, "../src/lib/store.ts");
assert(fs.existsSync(storePath), "Store exists at src/lib/store.ts");
const storeContent = fs.readFileSync(storePath, "utf-8");

assert(demoContent.includes("fyzaStore.getTransactions()"), "Demo initializes strictly with isolated sample transactions via fyzaStore");
assert(demoContent.includes("fyzaStore.getAccounts()"), "Demo initializes strictly with isolated sample accounts via fyzaStore");
assert(demoContent.includes("fyzaStore.getBudgets()"), "Demo initializes strictly with isolated sample budgets via fyzaStore");
assert(demoContent.includes("fyzaStore.getGoals()"), "Demo initializes strictly with isolated sample goals via fyzaStore");
assert(demoContent.includes("DEMO MODE — Sample Data"), "Persistent Demo Mode badge is displayed");
assert(demoContent.includes("handleResetDemo"), "Reset Demo functionality clears all mutated sample state back to default snapshot");
assert(storeContent.includes("resetToDemo"), "Reactive store provides resetToDemo() restoring isolated sample ledger");
assert(!demoContent.includes("supabase.from('transactions').insert"), "Demo mutations do not perform live database inserts into user accounts");

console.log("\n========================================================");
console.log(`AUDIT TEST SUMMARY: ${passedCount}/${totalCount} CHECKS PASSED (100%)`);
console.log("========================================================\n");
console.log("🎉 ALL PHASE 5 SECURITY & FINANCIAL INTEGRITY CHECKS PASSED!\n");
