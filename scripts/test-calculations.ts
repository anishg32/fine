// ============================================================
// FYZA UNIT & INTEGRATION TEST RUNNER
// Validates all critical financial calculations, currency formatting,
// transfer ledger rules, and savings formulas.
// ============================================================

import assert from "node:assert";
import {
  calculateTotalBalance,
  calculatePeriodIncome,
  calculatePeriodExpenses,
  calculateNetCashFlow,
  calculateSavingsRate,
  calculateBudgetCategoryUtilization,
  calculateGoalMonthlyTarget,
  calculateFinancialHealthScore,
  generateFinancialForecast,
} from "../src/lib/calculations";
import { formatCurrency, toMinorUnits, toMajorUnits } from "../src/lib/utils";
import type { Transaction } from "../src/lib/types";

console.log("🚀 Running Fyza Financial Verification Tests...\n");

// 1. Currency & Minor Unit Conversions
console.log("TEST 1: Minor Unit Conversions & Safe Formatting");
assert.strictEqual(toMinorUnits(1450.5), 145050);
assert.strictEqual(toMajorUnits(145050), 1450.5);
assert.strictEqual(toMinorUnits(0.01), 1);
assert.strictEqual(toMajorUnits(1), 0.01);

const formattedInr = formatCurrency(14500000, "INR", "en-IN");
assert.ok(formattedInr.includes("1,45,000"), `Expected 1,45,000, got ${formattedInr}`);
console.log("  ✔ Currency formatting and integer minor unit conversions pass.");

// 2. Income, Expenses & Transfer Isolation
console.log("\nTEST 2: Transfer ledger isolation from Income & Expenses");
const sampleTransactions: Transaction[] = [
  {
    id: "t1",
    user_id: "u1",
    account_id: "acc1",
    type: "income",
    amount: 10000000, // ₹1,00,000
    currency: "INR",
    category_id: "c1",
    description: "Salary",
    transaction_date: "2026-10-01",
    merchant: null,
    notes: null,
    tags: [],
    is_recurring: false,
    recurring_id: null,
    transfer_account_id: null,
    created_at: "",
    updated_at: "",
  },
  {
    id: "t2",
    user_id: "u1",
    account_id: "acc1",
    type: "expense",
    amount: 3000000, // ₹30,000
    currency: "INR",
    category_id: "c2",
    description: "Rent",
    transaction_date: "2026-10-02",
    merchant: null,
    notes: null,
    tags: [],
    is_recurring: false,
    recurring_id: null,
    transfer_account_id: null,
    created_at: "",
    updated_at: "",
  },
  {
    id: "t3",
    user_id: "u1",
    account_id: "acc1",
    type: "transfer",
    amount: 2500000, // ₹25,000 transfer to savings
    currency: "INR",
    category_id: null,
    description: "Transfer to emergency fund",
    transaction_date: "2026-10-03",
    merchant: null,
    notes: null,
    tags: [],
    is_recurring: false,
    recurring_id: null,
    transfer_account_id: "acc2",
    created_at: "",
    updated_at: "",
  },
];

const inc = calculatePeriodIncome(sampleTransactions);
const exp = calculatePeriodExpenses(sampleTransactions);
const net = calculateNetCashFlow(inc, exp);

assert.strictEqual(inc, 10000000, "Income must equal 10000000");
assert.strictEqual(exp, 3000000, "Expenses must equal 3000000 (transfers excluded!)");
assert.strictEqual(net, 7000000, "Net flow must equal 7000000");
console.log("  ✔ Income, expenses, and transfer exclusions verified correctly.");

// 3. Savings Rate Formula
console.log("\nTEST 3: Savings rate calculations & boundary protection");
const rate = calculateSavingsRate(inc, exp);
assert.strictEqual(rate, 70, `Expected 70% savings rate, got ${rate}%`);

// Zero income test
const zeroIncRate = calculateSavingsRate(0, 500000);
assert.strictEqual(zeroIncRate, 0, "Zero income must yield 0% savings rate without throwing DivisionByZero");

// Expenses greater than income
const negRate = calculateSavingsRate(1000000, 1500000);
assert.strictEqual(negRate, -50, "Expenses exceeding income must yield negative rate (-50%)");
console.log("  ✔ Savings rate formula and edge-cases validated.");

// 4. Budget Utilization
console.log("\nTEST 4: Budget category utilization");
const budgetUtil = calculateBudgetCategoryUtilization(1000000, 750000); // Limit ₹10k, spent ₹7.5k
assert.strictEqual(budgetUtil.percentage, 75);
assert.strictEqual(budgetUtil.remaining, 250000);
assert.strictEqual(budgetUtil.isOverBudget, false);

const overBudgetUtil = calculateBudgetCategoryUtilization(1000000, 1200000); // Spent ₹12k
assert.strictEqual(overBudgetUtil.percentage, 120);
assert.strictEqual(overBudgetUtil.remaining, 0);
assert.strictEqual(overBudgetUtil.isOverBudget, true);
console.log("  ✔ Budget threshold and over-budget flags verified.");

// 5. Goal Pacing
console.log("\nTEST 5: Goal pacing & monthly target recommendation");
const pacing = calculateGoalMonthlyTarget(30000000, 12000000, "2027-04-01"); // ₹3,00,000 target, ₹1,20,000 current
assert.strictEqual(pacing.remainingMinor, 18000000);
assert.ok(pacing.monthsRemaining > 0);
assert.ok(pacing.recommendedMonthlyMinor > 0);
console.log("  ✔ Goal contribution pacing calculation passes.");

// 6. Financial Health Score
console.log("\nTEST 6: Financial health score transparency");
const health = calculateFinancialHealthScore({
  monthlyIncomeMinor: 15000000,
  monthlyExpenseMinor: 6000000,
  totalLiquidBalanceMinor: 40000000,
  budgetLimitMinor: 8000000,
  budgetSpentMinor: 6000000,
});
assert.ok(health.totalScore >= 70, `Health score should be high, got ${health.totalScore}`);
assert.strictEqual(health.rating, "Excellent");
assert.ok(health.insights.length > 0);
console.log(`  ✔ Health score transparent components verified (${health.totalScore}/100 ${health.rating}).`);

// 7. Multi-Scenario Forecast
console.log("\nTEST 7: Multi-Scenario Forecast generation");
const forecast = generateFinancialForecast({
  startingBalanceMinor: 50000000,
  avgMonthlyIncomeMinor: 15000000,
  avgMonthlyExpenseMinor: 6000000,
  monthsAhead: 6,
});
assert.strictEqual(forecast.conservative.length, 6);
assert.strictEqual(forecast.expected.length, 6);
assert.strictEqual(forecast.optimistic.length, 6);
assert.ok(
  forecast.optimistic[5].balance > forecast.conservative[5].balance,
  "Optimistic projection must exceed conservative projection"
);
console.log("  ✔ Multi-scenario forecast projections verified.");

console.log("\n✨ ALL 7 CRITICAL FINANCIAL UNIT TESTS PASSED WITH 100% SUCCESS!\n");
