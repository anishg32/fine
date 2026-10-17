import {
  generateSmartSpendingInsights,
  calculateEmergencyBuffer,
  simulateWhatIfScenarios,
  calculateSmartGoalPacing,
  calculateFinancialHealthScore,
} from "../src/lib/calculations";
import type { Transaction, Account, Goal, Budget, RecurringTransaction } from "../src/lib/types";

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${testName}${detail ? ` - ${detail}` : ""}`);
    failed++;
  }
}

console.log("=================================================");
console.log("FYZA PHASE 4: FINANCIAL INTELLIGENCE & FORECAST TESTS");
console.log("=================================================\n");

// --- TEST 1: Smart Spending Insights Engine ---
console.log("--- 1. Testing generateSmartSpendingInsights ---");

const categoriesMap: Record<string, { name: string; color: string; icon: string }> = {
  cat_dining: { name: "Dining & Food", color: "#F59E0B", icon: "Utensils" },
  cat_rent: { name: "Apartment Rent", color: "#3B82F6", icon: "Home" },
  cat_shopping: { name: "Shopping", color: "#EC4899", icon: "ShoppingBag" },
  cat_utilities: { name: "Utilities", color: "#6366F1", icon: "Zap" },
};

const curTxs: Transaction[] = [
  {
    id: "tx-1",
    user_id: "u1",
    account_id: "acc-1",
    category_id: "cat_rent",
    amount: 3200000, // ₹32,000 (32% of 100k outflow -> Category Dominance)
    currency: "INR",
    type: "expense",
    description: "Monthly Rent",
    transaction_date: "2026-10-01",
    merchant: null,
    notes: null,
    tags: [],
    is_recurring: true,
    recurring_id: null,
    transfer_account_id: null,
    created_at: "2026-10-01T00:00:00Z",
    updated_at: "2026-10-01T00:00:00Z",
  },
  {
    id: "tx-2",
    user_id: "u1",
    account_id: "acc-1",
    category_id: "cat_shopping",
    amount: 2500000, // ₹25,000 (Unusual large transaction > 2.5x other mean)
    currency: "INR",
    type: "expense",
    description: "New Smartphone",
    transaction_date: "2026-10-05",
    merchant: null,
    notes: null,
    tags: [],
    is_recurring: false,
    recurring_id: null,
    transfer_account_id: null,
    created_at: "2026-10-05T00:00:00Z",
    updated_at: "2026-10-05T00:00:00Z",
  },
  {
    id: "tx-3",
    user_id: "u1",
    account_id: "acc-1",
    category_id: "cat_dining",
    amount: 600000, // ₹6,000
    currency: "INR",
    type: "expense",
    description: "Fine Dining Weekend",
    transaction_date: "2026-10-10",
    merchant: null,
    notes: null,
    tags: [],
    is_recurring: false,
    recurring_id: null,
    transfer_account_id: null,
    created_at: "2026-10-10T00:00:00Z",
    updated_at: "2026-10-10T00:00:00Z",
  },
  {
    id: "tx-4",
    user_id: "u1",
    account_id: "acc-1",
    category_id: "cat_utilities",
    amount: 300000, // ₹3,000
    currency: "INR",
    type: "expense",
    description: "Electricity Bill",
    transaction_date: "2026-10-12",
    merchant: null,
    notes: null,
    tags: [],
    is_recurring: true,
    recurring_id: null,
    transfer_account_id: null,
    created_at: "2026-10-12T00:00:00Z",
    updated_at: "2026-10-12T00:00:00Z",
  },
];

const prevTxs: Transaction[] = [
  {
    id: "tx-prev-1",
    user_id: "u1",
    account_id: "acc-1",
    category_id: "cat_rent",
    amount: 3200000,
    currency: "INR",
    type: "expense",
    description: "September Rent",
    transaction_date: "2026-09-01",
    merchant: null,
    notes: null,
    tags: [],
    is_recurring: true,
    recurring_id: null,
    transfer_account_id: null,
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
  },
  {
    id: "tx-prev-2",
    user_id: "u1",
    account_id: "acc-1",
    category_id: "cat_dining",
    amount: 1500000,
    currency: "INR",
    type: "expense",
    description: "September Dining",
    transaction_date: "2026-09-15",
    merchant: null,
    notes: null,
    tags: [],
    is_recurring: false,
    recurring_id: null,
    transfer_account_id: null,
    created_at: "2026-09-15T00:00:00Z",
    updated_at: "2026-09-15T00:00:00Z",
  },
];

const testBudgets: Budget[] = [
  {
    id: "bgt-1",
    user_id: "u1",
    name: "Living Cap",
    month: 10,
    year: 2026,
    total_limit: 7000000, // ₹70,000 (spent is 66,000 -> 94% utilization warning)
    is_active: true,
    created_at: "2026-10-01T00:00:00Z",
    updated_at: "2026-10-01T00:00:00Z",
  },
];

const insights = generateSmartSpendingInsights({
  currentMonthTransactions: curTxs,
  previousMonthTransactions: prevTxs,
  categoriesMap,
  budgets: testBudgets,
});

assert(insights.length >= 3, "Smart insights generated successfully", `Count: ${insights.length}`);
assert(
  insights.some((i) => i.type === "category_dominance"),
  "Detected Category Dominance insight (Rent >= 30%)"
);
assert(
  insights.some((i) => i.type === "unusual_transaction"),
  "Detected Unusual Large Purchase (Smartphone > 2.5x mean)"
);
assert(
  insights.some((i) => i.type === "period_comparison"),
  "Detected Month-over-Month Spending Change"
);
assert(
  insights.some((i) => i.type === "budget_alert"),
  "Detected Budget Alert (>75% threshold)"
);

// --- TEST 2: Emergency Buffer Runway Analysis ---
console.log("\n--- 2. Testing calculateEmergencyBuffer ---");

const testAccounts: Account[] = [
  {
    id: "acc-1",
    user_id: "u1",
    name: "HDFC Primary Savings",
    type: "savings",
    currency: "INR",
    opening_balance: 10000000,
    current_balance: 30000000, // ₹3,00,000 (Liquid)
    description: null,
    icon: null,
    color: null,
    is_archived: false,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "acc-2",
    user_id: "u1",
    name: "Physical Cash",
    type: "cash",
    currency: "INR",
    opening_balance: 500000,
    current_balance: 1500000, // ₹15,000 (Liquid)
    description: null,
    icon: null,
    color: null,
    is_archived: false,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "acc-3",
    user_id: "u1",
    name: "Zerodha Stock Portfolio",
    type: "other", // non-liquid investment account
    currency: "INR",
    opening_balance: 50000000,
    current_balance: 85000000, // ₹8,50,000 (Non-liquid, must be excluded)
    description: "Demat Equity",
    icon: null,
    color: null,
    is_archived: false,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
];

const bufferResult = calculateEmergencyBuffer({
  accounts: testAccounts,
  essentialMonthlyExpenseMinor: 3500000, // ₹35,000 / month
});

assert(
  bufferResult.liquidBalanceMinor === 31500000,
  "Excluded non-liquid investment accounts from liquid reserve",
  `Liquid: ₹${bufferResult.liquidBalanceMinor / 100}`
);
assert(
  bufferResult.monthsCovered === 9,
  "Correct months of essential burn covered (315k / 35k = 9.0m)",
  `Covered: ${bufferResult.monthsCovered}m`
);
assert(bufferResult.status === "Robust", "Classified 9-month buffer as 'Robust'");
assert(
  bufferResult.accountsExcluded.some((a) => a.includes("Zerodha")),
  "Documented Zerodha account in accountsExcluded audit list"
);

// --- TEST 3: What-If Multi-Scenario Simulator ---
console.log("\n--- 3. Testing simulateWhatIfScenarios ---");

const simParams = {
  startingBalanceMinor: 40000000, // ₹4,00,000
  monthlyIncomeMinor: 15000000, // ₹1,50,000
  essentialExpensesMinor: 3500000, // ₹35,000
  discretionaryExpensesMinor: 1500000, // ₹15,000
  discretionaryReductionPct: 20, // 20% trim = ₹3,000 saved/mo
  oneTimeUpcomingExpensesMinor: 5000000, // ₹50,000 in Month 2
  projectionMonths: 12,
  startYear: 2026,
  startMonth: 9, // October
};

const simResult = simulateWhatIfScenarios(simParams);

assert(simResult.durationMonths === 12, "Simulation duration exactly 12 months");
assert(
  simResult.discretionaryReductionSavingsMonthly === 300000,
  "20% trim on ₹15,000 discretionary produces exactly ₹3,000/mo savings",
  `Monthly trim savings: ₹${simResult.discretionaryReductionSavingsMonthly / 100}`
);
assert(
  simResult.discretionaryReductionSavingsTotal === 3600000,
  "Total 12-month trim savings equals ₹36,000",
  `Total trim savings: ₹${simResult.discretionaryReductionSavingsTotal / 100}`
);
assert(
  simResult.expected.finalBalance > simResult.conservative.finalBalance,
  "Expected scenario outpaces Conservative scenario due to disciplined inflation & trim"
);
assert(
  simResult.optimistic.finalBalance > simResult.expected.finalBalance,
  "Optimistic scenario outpaces Expected scenario due to 10% income growth"
);
assert(
  simResult.conservative.assumptions.length >= 3 &&
    simResult.expected.assumptions.length >= 3 &&
    simResult.optimistic.assumptions.length >= 3,
  "All 3 scenarios document explicit, explainable mathematical assumptions"
);
assert(
  simResult.limitations.length >= 3,
  "Limitations and non-guaranteed disclaimers explicitly articulated"
);

// --- TEST 4: Smart Savings Goal Pacing ---
console.log("\n--- 4. Testing calculateSmartGoalPacing ---");

const testGoal: Goal = {
  id: "g-1",
  user_id: "u1",
  name: "Japan Vacation",
  target_amount: 30000000, // ₹3,00,000
  current_amount: 6000000, // ₹60,000 (Remaining = ₹2,40,000)
  target_date: "2027-04-15", // ~6 months away
  category: "travel",
  description: "Spring Cherry Blossom trip",
  icon: "Plane",
  color: "#38BDF8",
  status: "active",
  created_at: "2026-10-15T00:00:00Z",
  updated_at: "2026-10-15T00:00:00Z",
};

const goalPacing = calculateSmartGoalPacing(
  testGoal,
  5000000, // ₹50,000 monthly cash surplus
  new Date("2026-10-15T00:00:00Z")
);

assert(goalPacing.remainingAmountMinor === 24000000, "Correct remaining target ₹2,40,000");
assert(
  goalPacing.targetDatePlan !== undefined && goalPacing.targetDatePlan.requiredMonthlyMinor > 0,
  "Calculated required monthly contribution for target date",
  `Required/mo: ₹${(goalPacing.targetDatePlan?.requiredMonthlyMinor || 0) / 100}`
);
assert(
  goalPacing.targetDatePlan?.isFeasibleWithCashFlow === true,
  "Target date plan verified feasible within monthly cash surplus"
);
assert(
  goalPacing.fixedPlans.length === 4,
  "Generated 4 fixed alternative contribution plans (₹2.5k, ₹5k, ₹10k, ₹25k)"
);

// Test tradeoff notice when required exceeds surplus
const tightPacing = calculateSmartGoalPacing(
  testGoal,
  2000000, // Only ₹20,000 monthly cash surplus (required is ~₹40,000/mo)
  new Date("2026-10-15T00:00:00Z")
);
assert(
  tightPacing.tradeoffNotice !== undefined,
  "Generated tradeoff notice to prevent starving essential expenses",
  tightPacing.tradeoffNotice
);

// --- TEST 5: Financial Health Score Transparent Model ---
console.log("\n--- 5. Testing calculateFinancialHealthScore ---");

const healthScore = calculateFinancialHealthScore({
  monthlyIncomeMinor: 15000000, // ₹1,50,000
  monthlyExpenseMinor: 5000000, // ₹50,000 (Savings rate 66.7% -> 35 pts)
  totalLiquidBalanceMinor: 35000000, // ₹3,50,000 (7 months buffer -> 25 pts)
  budgetLimitMinor: 6000000, // ₹60,000 (Spent 50k <= 90% -> 25 pts)
  budgetSpentMinor: 5000000,
});

assert(healthScore.totalScore === 100, "Full 100 points for optimal financial health", `Score: ${healthScore.totalScore}`);
assert(healthScore.rating === "Excellent", "Classified score 100 as 'Excellent'");
assert(healthScore.breakdown.savingsRateScore === 35, "Full 35 points for >30% savings rate");
assert(healthScore.breakdown.emergencyBufferScore === 25, "Full 25 points for >=3 months emergency buffer");
assert(healthScore.breakdown.budgetScore === 25, "Full 25 points for disciplined budget adherence");
assert(healthScore.breakdown.cashFlowScore === 15, "Full 15 points for positive net cash flow");

// Edge case: Zero income
const zeroIncomeScore = calculateFinancialHealthScore({
  monthlyIncomeMinor: 0,
  monthlyExpenseMinor: 4000000,
  totalLiquidBalanceMinor: 2000000,
});
assert(
  zeroIncomeScore.totalScore < 50,
  "Correctly assigns low score when income is zero",
  `Zero income score: ${zeroIncomeScore.totalScore}`
);
assert(
  zeroIncomeScore.rating === "Needs Attention",
  "Rating is 'Needs Attention' on zero income"
);

console.log("\n=================================================");
console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log("=================================================");

if (failed > 0) {
  process.exit(1);
} else {
  console.log("ALL PHASE 4 FINANCIAL INTELLIGENCE & FORECAST TESTS PASSED! 🎉");
}
