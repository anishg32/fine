import { parseNaturalLanguageTransaction } from "../src/lib/ai-nlp";
import type { Account, Category } from "../src/lib/types";

const mockAccounts: Account[] = [
  {
    id: "acc-1",
    user_id: "user-1",
    name: "HDFC Salary Account",
    type: "checking",
    currency: "INR",
    opening_balance: 20000000,
    current_balance: 24500000,
    description: null,
    is_archived: false,
    icon: null,
    color: null,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
  },
  {
    id: "acc-2",
    user_id: "user-1",
    name: "ICICI Savings Reserve",
    type: "savings",
    currency: "INR",
    opening_balance: 10000000,
    current_balance: 15000000,
    description: null,
    is_archived: false,
    icon: null,
    color: null,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
  },
  {
    id: "acc-3",
    user_id: "user-1",
    name: "HDFC Regalia Credit Card",
    type: "credit",
    currency: "INR",
    opening_balance: 0,
    current_balance: -3500000,
    description: null,
    is_archived: false,
    icon: null,
    color: null,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
  },
  {
    id: "acc-4",
    user_id: "user-1",
    name: "Emergency Fund",
    type: "savings",
    currency: "INR",
    opening_balance: 25000000,
    current_balance: 30000000,
    description: null,
    is_archived: false,
    icon: null,
    color: null,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
  },
];

const mockCategories: Category[] = [
  { id: "cat-1", user_id: "user-1", name: "Food & Dining", type: "expense", icon: "Utensils", color: "#F59E0B", is_default: true, parent_id: null, created_at: "2026-01-01" },
  { id: "cat-2", user_id: "user-1", name: "Groceries", type: "expense", icon: "ShoppingCart", color: "#10B981", is_default: true, parent_id: null, created_at: "2026-01-01" },
  { id: "cat-3", user_id: "user-1", name: "Transportation", type: "expense", icon: "Car", color: "#06B6D4", is_default: true, parent_id: null, created_at: "2026-01-01" },
  { id: "cat-4", user_id: "user-1", name: "Housing", type: "expense", icon: "Home", color: "#6366F1", is_default: true, parent_id: null, created_at: "2026-01-01" },
  { id: "cat-5", user_id: "user-1", name: "Utilities", type: "expense", icon: "Zap", color: "#EAB308", is_default: true, parent_id: null, created_at: "2026-01-01" },
  { id: "cat-6", user_id: "user-1", name: "Entertainment", type: "expense", icon: "Film", color: "#EC4899", is_default: true, parent_id: null, created_at: "2026-01-01" },
  { id: "cat-7", user_id: "user-1", name: "Shopping", type: "expense", icon: "ShoppingBag", color: "#8B5CF6", is_default: true, parent_id: null, created_at: "2026-01-01" },
  { id: "cat-8", user_id: "user-1", name: "Healthcare", type: "expense", icon: "HeartPulse", color: "#EF4444", is_default: true, parent_id: null, created_at: "2026-01-01" },
  { id: "cat-9", user_id: "user-1", name: "Income", type: "income", icon: "Briefcase", color: "#10B981", is_default: true, parent_id: null, created_at: "2026-01-01" },
  { id: "cat-10", user_id: "user-1", name: "Investments", type: "expense", icon: "TrendingUp", color: "#3B82F6", is_default: true, parent_id: null, created_at: "2026-01-01" },
];

console.log("=================================================");
console.log("FYZA AI NATURAL LANGUAGE FINANCIAL NLP TESTS");
console.log("=================================================\n");

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`✅ PASS: ${msg}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${msg}`);
    failed++;
  }
}

// Test 1: Expense with merchant, category, credit card account
const test1 = parseNaturalLanguageTransaction(
  "Spent ₹350 on coffee at Starbucks with HDFC Regalia Credit Card",
  mockAccounts,
  mockCategories
);
assert(test1.type === "expense", "Test 1: Type detected as expense");
assert(test1.amountMajor === 350, "Test 1: Amount major is ₹350");
assert(test1.amountMinor === 35000, "Test 1: Amount minor is 35000 paise");
assert(test1.merchant === "Starbucks", "Test 1: Merchant detected as Starbucks");
assert(test1.categoryName === "Food & Dining", "Test 1: Category detected as Food & Dining");
assert(test1.accountId === "acc-3", "Test 1: Account detected as HDFC Regalia Credit Card");

// Test 2: Groceries with shorthand amount (2.4k) and Blinkit merchant
const test2 = parseNaturalLanguageTransaction(
  "Paid 2.4k for groceries at Blinkit via ICICI",
  mockAccounts,
  mockCategories
);
assert(test2.type === "expense", "Test 2: Type is expense");
assert(test2.amountMajor === 2400, "Test 2: Shorthand 2.4k parsed as 2400");
assert(test2.amountMinor === 240000, "Test 2: Minor units 240000");
assert(test2.categoryName === "Groceries", "Test 2: Category detected as Groceries");
assert(test2.accountId === "acc-2", "Test 2: Account matched to ICICI");

// Test 3: Salary income with lakh notation
const test3 = parseNaturalLanguageTransaction(
  "Salary credited 1.45 lakh from Google into HDFC Salary Account",
  mockAccounts,
  mockCategories
);
assert(test3.type === "income", "Test 3: Type detected as income");
assert(test3.amountMajor === 145000, "Test 3: 1.45 lakh parsed as 145000");
assert(test3.amountMinor === 14500000, "Test 3: 14500000 minor units");
assert(test3.accountId === "acc-1", "Test 3: Account matched to HDFC Salary Account");

// Test 4: Transfer from one account to another
const test4 = parseNaturalLanguageTransaction(
  "Transferred 15000 from ICICI Savings Reserve to Emergency Fund",
  mockAccounts,
  mockCategories
);
assert(test4.type === "transfer", "Test 4: Type detected as transfer");
assert(test4.amountMajor === 15000, "Test 4: Amount parsed as 15000");
assert(test4.accountId === "acc-2", "Test 4: Source account is ICICI Savings");
assert(test4.transferAccountId === "acc-4", "Test 4: Destination account is Emergency Fund");
assert(test4.categoryId === null, "Test 4: Category is null for transfer (ledger isolation)");

// Test 5: Date detection (yesterday)
const test5 = parseNaturalLanguageTransaction(
  "Uber cab to airport 850 yesterday",
  mockAccounts,
  mockCategories
);
const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
const expectedYesterday = yesterday.toISOString().split("T")[0];
assert(test5.transactionDate === expectedYesterday, `Test 5: Date parsed as yesterday (${expectedYesterday})`);
assert(test5.categoryName === "Transportation", "Test 5: Category detected as Transportation");
assert(test5.amountMajor === 850, "Test 5: Amount is 850");

// Test 6: Electricity bill via utilities
const test6 = parseNaturalLanguageTransaction(
  "Paid electricity bill ₹3,200 via HDFC",
  mockAccounts,
  mockCategories
);
assert(test6.type === "expense", "Test 6: Type is expense");
assert(test6.amountMajor === 3200, "Test 6: ₹3,200 parsed with comma as 3200");
assert(test6.categoryName === "Utilities", "Test 6: Category detected as Utilities");

console.log("\n=================================================");
console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log("=================================================");

if (failed > 0) {
  process.exit(1);
} else {
  console.log("ALL AI NATURAL LANGUAGE NLP TESTS PASSED! 🚀\n");
}
