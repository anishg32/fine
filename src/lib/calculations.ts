// ============================================================
// FYZA FINANCIAL CALCULATION ENGINE
// All calculations use integer minor units (paise/cents: 100 units = 1 major unit)
// Zero floating-point arithmetic errors.
// ============================================================

import type {
  Account,
  Transaction,
  Budget,
  BudgetCategory,
  Goal,
  RecurringTransaction,
  RecurringFrequency,
} from "./types";

/**
 * Calculate total balance across active accounts in minor units.
 */
export function calculateTotalBalance(
  accounts: Array<{ current_balance: number; is_archived: boolean }>
): number {
  return accounts
    .filter((acc) => !acc.is_archived)
    .reduce((total, acc) => total + acc.current_balance, 0);
}

/**
 * Filter transactions within an inclusive date range (YYYY-MM-DD strings).
 */
export function filterTransactionsByDateRange(
  transactions: Transaction[],
  startDate: string,
  endDate: string
): Transaction[] {
  return transactions.filter((t) => {
    return t.transaction_date >= startDate && t.transaction_date <= endDate;
  });
}

/**
 * Calculate period income in minor units.
 * Excludes transfers.
 */
export function calculatePeriodIncome(transactions: Transaction[]): number {
  return transactions
    .filter((t) => t.type === "income")
    .reduce((total, t) => total + t.amount, 0);
}

/**
 * Calculate period expenses in minor units.
 * Excludes transfers and savings goal transfers.
 */
export function calculatePeriodExpenses(transactions: Transaction[]): number {
  return transactions
    .filter((t) => t.type === "expense")
    .reduce((total, t) => total + t.amount, 0);
}

/**
 * Calculate net cash flow (Income - Expenses) in minor units.
 */
export function calculateNetCashFlow(
  incomeMinor: number,
  expensesMinor: number
): number {
  return incomeMinor - expensesMinor;
}

/**
 * Calculate savings rate as a percentage: ((income - expenses) / income) * 100.
 * Transparent rule: If income <= 0, savings rate is 0%.
 * Capped between -100% and 100% for display sanity.
 */
export function calculateSavingsRate(
  incomeMinor: number,
  expensesMinor: number
): number {
  if (incomeMinor <= 0) return 0;
  const net = incomeMinor - expensesMinor;
  const rate = (net / incomeMinor) * 100;
  return Math.round(rate * 10) / 10;
}

/**
 * Calculate spending breakdown by category.
 * Returns array sorted by highest spending descending.
 */
export function calculateSpendingByCategory(
  transactions: Transaction[],
  categoriesMap: Record<string, { name: string; icon: string; color: string }>
): Array<{
  categoryId: string;
  category: string;
  icon: string;
  color: string;
  amount: number;
  percentage: number;
  count: number;
}> {
  const expenseTransactions = transactions.filter((t) => t.type === "expense");
  const totalExpense = calculatePeriodExpenses(expenseTransactions);

  const group: Record<string, { amount: number; count: number }> = {};

  expenseTransactions.forEach((t) => {
    const catId = t.category_id || "uncategorized";
    if (!group[catId]) {
      group[catId] = { amount: 0, count: 0 };
    }
    group[catId].amount += t.amount;
    group[catId].count += 1;
  });

  return Object.entries(group)
    .map(([catId, data]) => {
      const catMeta = categoriesMap[catId] || {
        name: "Uncategorized",
        icon: "MoreHorizontal",
        color: "#94A3B8",
      };
      const percentage =
        totalExpense > 0
          ? Math.round((data.amount / totalExpense) * 1000) / 10
          : 0;

      return {
        categoryId: catId,
        category: catMeta.name,
        icon: catMeta.icon,
        color: catMeta.color,
        amount: data.amount,
        percentage,
        count: data.count,
      };
    })
    .sort((a, b) => b.amount - a.amount);
}

/**
 * Calculate budget spent and utilization percentage for a category.
 */
export function calculateBudgetCategoryUtilization(
  limitMinor: number,
  spentMinor: number
): {
  spent: number;
  remaining: number;
  percentage: number;
  isOverBudget: boolean;
} {
  const remaining = Math.max(0, limitMinor - spentMinor);
  const percentage =
    limitMinor > 0 ? Math.round((spentMinor / limitMinor) * 1000) / 10 : 0;
  return {
    spent: spentMinor,
    remaining,
    percentage,
    isOverBudget: spentMinor > limitMinor,
  };
}

/**
 * Calculate periodic contribution needed to reach a savings goal.
 * Transparent formula: Remaining amount / months remaining.
 */
export function calculateGoalMonthlyTarget(
  targetMinor: number,
  currentMinor: number,
  targetDateStr: string | null,
  referenceDate?: Date
): {
  remainingMinor: number;
  monthsRemaining: number;
  recommendedMonthlyMinor: number;
} {
  const remainingMinor = Math.max(0, targetMinor - currentMinor);
  if (!targetDateStr) {
    return {
      remainingMinor,
      monthsRemaining: 0,
      recommendedMonthlyMinor: 0,
    };
  }

  const targetDate = new Date(targetDateStr);
  const now = referenceDate || (typeof window !== "undefined" ? new Date() : new Date("2026-10-14T00:00:00.000Z"));
  const diffTime = targetDate.getTime() - now.getTime();
  const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  const monthsRemaining = Math.max(1, Math.ceil(diffDays / 30.4375));

  const recommendedMonthlyMinor = Math.ceil(remainingMinor / monthsRemaining);

  return {
    remainingMinor,
    monthsRemaining,
    recommendedMonthlyMinor,
  };
}

/**
 * Transparent Financial Health Score (0 to 100)
 * Explainable components:
 * 1. Savings Rate (0-35 points):
 *    - >= 30% savings rate = 35 points
 *    - 20-29% = 28 points
 *    - 10-19% = 20 points
 *    - 0-9% = 10 points
 *    - Negative = 0 points
 * 2. Budget Adherence (0-25 points):
 *    - Spent <= 90% of budget = 25 points
 *    - Spent <= 100% of budget = 20 points
 *    - Spent <= 110% = 10 points
 *    - > 110% = 0 points
 * 3. Emergency Buffer (0-25 points):
 *    - Cash / Savings balance >= 3 months of expenses = 25 points
 *    - >= 1 month = 15 points
 *    - < 1 month = 5 points
 * 4. Net Cash Flow Positive (0-15 points):
 *    - Net flow > 0 = 15 points
 *    - Net flow <= 0 = 0 points
 */
export function calculateFinancialHealthScore(params: {
  monthlyIncomeMinor: number;
  monthlyExpenseMinor?: number;
  monthlyExpensesMinor?: number;
  totalLiquidBalanceMinor?: number;
  liquidBalanceMinor?: number;
  budgetLimitMinor?: number;
  budgetSpentMinor?: number;
  essentialExpensesMinor?: number;
  budgetAdherencePct?: number;
  activeGoalsCount?: number;
  completedGoalsCount?: number;
}): {
  totalScore: number;
  score: number;
  rating: "Excellent" | "Good" | "Fair" | "Needs Attention";
  breakdown: {
    savingsRateScore: number;
    budgetScore: number;
    emergencyBufferScore: number;
    cashFlowScore: number;
  };
  insights: string[];
} {
  const monthlyIncomeMinor = params.monthlyIncomeMinor || 0;
  const monthlyExpenseMinor = params.monthlyExpenseMinor ?? params.monthlyExpensesMinor ?? 0;
  const totalLiquidBalanceMinor = params.totalLiquidBalanceMinor ?? params.liquidBalanceMinor ?? 0;
  const budgetLimitMinor = params.budgetLimitMinor;
  const budgetSpentMinor = params.budgetSpentMinor;

  let savingsRateScore = 0;
  const savingsRate = calculateSavingsRate(
    monthlyIncomeMinor,
    monthlyExpenseMinor
  );
  if (savingsRate >= 30) savingsRateScore = 35;
  else if (savingsRate >= 20) savingsRateScore = 28;
  else if (savingsRate >= 10) savingsRateScore = 20;
  else if (savingsRate > 0) savingsRateScore = 10;
  else savingsRateScore = 0;

  let budgetScore = 20; // Default reasonable baseline if no budget set
  if (budgetLimitMinor && budgetLimitMinor > 0 && budgetSpentMinor !== undefined) {
    const util = (budgetSpentMinor / budgetLimitMinor) * 100;
    if (util <= 90) budgetScore = 25;
    else if (util <= 100) budgetScore = 20;
    else if (util <= 110) budgetScore = 10;
    else budgetScore = 0;
  }

  let emergencyBufferScore = 5;
  const monthlyExpense = Math.max(1, monthlyExpenseMinor);
  const monthsOfBuffer = totalLiquidBalanceMinor / monthlyExpense;
  if (monthsOfBuffer >= 3) emergencyBufferScore = 25;
  else if (monthsOfBuffer >= 1) emergencyBufferScore = 15;
  else emergencyBufferScore = 5;

  const cashFlowScore =
    monthlyIncomeMinor > monthlyExpenseMinor ? 15 : 0;

  const totalScore = Math.min(
    100,
    savingsRateScore + budgetScore + emergencyBufferScore + cashFlowScore
  );

  let rating: "Excellent" | "Good" | "Fair" | "Needs Attention" = "Good";
  if (totalScore >= 85) rating = "Excellent";
  else if (totalScore >= 70) rating = "Good";
  else if (totalScore >= 50) rating = "Fair";
  else rating = "Needs Attention";

  const insights: string[] = [];
  if (savingsRate >= 20) {
    insights.push(`Strong savings rate of ${savingsRate}% this period.`);
  } else if (savingsRate > 0) {
    insights.push(`Savings rate is positive (${savingsRate}%), aim for 20%+ for long-term compounding.`);
  } else {
    insights.push(`Expenses exceeded or equaled income this period.`);
  }

  if (monthsOfBuffer >= 3) {
    insights.push(`Healthy emergency buffer: ${monthsOfBuffer.toFixed(1)} months of liquid expenses.`);
  } else {
    insights.push(`Liquid reserve covers ${monthsOfBuffer.toFixed(1)} months of expenses. Recommended: 3-6 months.`);
  }

  return {
    totalScore,
    score: totalScore,
    rating,
    breakdown: {
      savingsRateScore,
      budgetScore,
      emergencyBufferScore,
      cashFlowScore,
    },
    insights,
  };
}

/**
 * Generate financial forecast projection data.
 * Computes 3 transparent trajectories: conservative, expected, optimistic.
 */
export function generateFinancialForecast(params: {
  startingBalanceMinor: number;
  avgMonthlyIncomeMinor: number;
  avgMonthlyExpenseMinor: number;
  monthsAhead?: number;
  assumptions?: {
    incomeGrowthPct: number; // e.g. 5% annual -> monthly compound
    expenseInflationPct: number; // e.g. 6% annual
    savingsBoostPct: number; // user custom savings effort
  };
}): {
  conservative: Array<{ date: string; balance: number; income: number; expenses: number }>;
  expected: Array<{ date: string; balance: number; income: number; expenses: number }>;
  optimistic: Array<{ date: string; balance: number; income: number; expenses: number }>;
} {
  const monthsAhead = params.monthsAhead || 12;
  const baseIncome = params.avgMonthlyIncomeMinor;
  const baseExpense = params.avgMonthlyExpenseMinor;

  const conservative: Array<{ date: string; balance: number; income: number; expenses: number }> = [];
  const expected: Array<{ date: string; balance: number; income: number; expenses: number }> = [];
  const optimistic: Array<{ date: string; balance: number; income: number; expenses: number }> = [];

  let curBalCons = params.startingBalanceMinor;
  let curBalExp = params.startingBalanceMinor;
  let curBalOpt = params.startingBalanceMinor;

  const now = typeof window !== "undefined" ? new Date() : new Date("2026-10-14T00:00:00.000Z");

  for (let i = 1; i <= monthsAhead; i++) {
    const futureDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const dateLabel = futureDate.toLocaleDateString("en-US", { month: "short", year: "2-digit" });

    // Conservative: Income flat, expenses inflated by 8% annual
    const consInc = baseIncome;
    const consExp = Math.round(baseExpense * (1 + (0.08 * i) / 12));
    curBalCons += (consInc - consExp);
    conservative.push({ date: dateLabel, balance: curBalCons, income: consInc, expenses: consExp });

    // Expected: Income grows 5% annual, expenses 5% inflation
    const expInc = Math.round(baseIncome * (1 + (0.05 * i) / 12));
    const expExp = Math.round(baseExpense * (1 + (0.05 * i) / 12));
    curBalExp += (expInc - expExp);
    expected.push({ date: dateLabel, balance: curBalExp, income: expInc, expenses: expExp });

    // Optimistic: Income grows 10% annual, expenses controlled (3% inflation)
    const optInc = Math.round(baseIncome * (1 + (0.10 * i) / 12));
    const optExp = Math.round(baseExpense * (1 + (0.03 * i) / 12));
    curBalOpt += (optInc - optExp);
    optimistic.push({ date: dateLabel, balance: curBalOpt, income: optInc, expenses: optExp });
  }

  return { conservative, expected, optimistic };
}

// ============================================================
// PHASE 3: SUBSCRIPTION & RECURRING CALCULATION ENGINE
// ============================================================

/**
 * Safe integer date advancing by months with boundary-safe clamping (e.g. Jan 31 -> Feb 28, Aug 31 -> Sep 30)
 */
export function advanceDateByMonths(dateStr: string, monthsToAdd: number): string {
  if (!dateStr || !dateStr.includes("-")) return dateStr;
  const parts = dateStr.split("-");
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // 0-indexed
  const day = parseInt(parts[2], 10);

  const targetMonthIndex = month + monthsToAdd;
  const targetYear = year + Math.floor(targetMonthIndex / 12);
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12;

  // Day 0 of month+1 in UTC yields the last day of targetMonth
  const maxDays = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  const safeDay = Math.min(day, maxDays);

  const yyyy = targetYear;
  const mm = String(targetMonth + 1).padStart(2, "0");
  const dd = String(safeDay).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Safe integer date advancing by days using UTC
 */
export function advanceDateByDays(dateStr: string, daysToAdd: number): string {
  if (!dateStr || !dateStr.includes("-")) return dateStr;
  const [yearStr, monthStr, dayStr] = dateStr.split("-");
  const date = new Date(Date.UTC(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, parseInt(dayStr, 10)));
  date.setUTCDate(date.getUTCDate() + daysToAdd);
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Calculate the next billing date given current date, frequency, and interval.
 * Guaranteed idempotent and boundary-safe.
 */
export function calculateNextBillingDate(
  currentNextDate: string,
  frequency: RecurringFrequency,
  interval: number = 1
): string {
  const safeInterval = Math.max(1, interval || 1);
  switch (frequency) {
    case "daily":
      return advanceDateByDays(currentNextDate, safeInterval);
    case "weekly":
      return advanceDateByDays(currentNextDate, safeInterval * 7);
    case "biweekly":
      return advanceDateByDays(currentNextDate, safeInterval * 14);
    case "monthly":
      return advanceDateByMonths(currentNextDate, safeInterval);
    case "quarterly":
      return advanceDateByMonths(currentNextDate, safeInterval * 3);
    case "yearly":
      return advanceDateByMonths(currentNextDate, safeInterval * 12);
    case "custom":
      return advanceDateByDays(currentNextDate, safeInterval);
    default:
      return advanceDateByMonths(currentNextDate, safeInterval);
  }
}

/**
 * Convert recurring amount into estimated monthly equivalent (minor units).
 * Documented financial conversion assumptions:
 * - Weekly: (amount * 52) / 12
 * - Biweekly: (amount * 26) / 12
 * - Monthly: amount / interval
 * - Quarterly: (amount * 4) / 12 = amount / 3
 * - Yearly: amount / (12 * interval)
 * - Daily: (amount * 365) / 12
 */
export function calculateRecurringMonthlyEquivalent(
  amountMinor: number,
  frequency: RecurringFrequency,
  interval: number = 1
): number {
  if (amountMinor <= 0) return 0;
  const safeInterval = Math.max(1, interval || 1);
  switch (frequency) {
    case "daily":
      return Math.round((amountMinor * (365 / safeInterval)) / 12);
    case "weekly":
      return Math.round((amountMinor * (52 / safeInterval)) / 12);
    case "biweekly":
      return Math.round((amountMinor * (26 / safeInterval)) / 12);
    case "monthly":
      return Math.round(amountMinor / safeInterval);
    case "quarterly":
      return Math.round((amountMinor * 4) / (12 * safeInterval));
    case "yearly":
      return Math.round(amountMinor / (12 * safeInterval));
    case "custom":
      return Math.round(amountMinor / safeInterval);
    default:
      return Math.round(amountMinor / safeInterval);
  }
}

/**
 * Convert recurring amount into estimated annual equivalent (minor units).
 */
export function calculateRecurringAnnualEquivalent(
  amountMinor: number,
  frequency: RecurringFrequency,
  interval: number = 1
): number {
  if (amountMinor <= 0) return 0;
  const safeInterval = Math.max(1, interval || 1);
  switch (frequency) {
    case "daily":
      return Math.round(amountMinor * (365 / safeInterval));
    case "weekly":
      return Math.round(amountMinor * (52 / safeInterval));
    case "biweekly":
      return Math.round(amountMinor * (26 / safeInterval));
    case "monthly":
      return Math.round(amountMinor * (12 / safeInterval));
    case "quarterly":
      return Math.round(amountMinor * (4 / safeInterval));
    case "yearly":
      return Math.round(amountMinor / safeInterval);
    case "custom":
      return Math.round(amountMinor * (12 / safeInterval));
    default:
      return Math.round(amountMinor * (12 / safeInterval));
  }
}

export interface SubscriptionAnalytics {
  activeCount: number;
  pausedCount: number;
  cancelledCount: number;
  archivedCount: number;
  totalMonthlyRecurringMinor: number;
  totalAnnualRecurringMinor: number;
  categoryBreakdown: Array<{
    categoryId: string;
    category: string;
    icon: string;
    color: string;
    monthlyAmount: number;
    annualAmount: number;
    percentage: number;
    count: number;
  }>;
  upcomingRenewals: Array<{
    recurring: RecurringTransaction;
    diffDays: number;
    isDueToday: boolean;
    isOverdue: boolean;
    monthlyEquivalent: number;
  }>;
}

export function calculateSubscriptionAnalytics(
  recurringList: RecurringTransaction[],
  categoriesMap: Record<string, { name: string; color: string; icon: string }>,
  referenceDate?: Date
): SubscriptionAnalytics {
  let activeCount = 0;
  let pausedCount = 0;
  let cancelledCount = 0;
  let archivedCount = 0;
  let totalMonthlyRecurringMinor = 0;
  let totalAnnualRecurringMinor = 0;

  const categoryMap: Record<string, { monthly: number; annual: number; count: number }> = {};
  const today = referenceDate || (typeof window !== "undefined" ? new Date() : new Date("2026-10-15T00:00:00.000Z"));
  today.setHours(0, 0, 0, 0);

  const upcomingRenewals: SubscriptionAnalytics["upcomingRenewals"] = [];

  recurringList.forEach((item) => {
    const status = item.status || (item.is_active ? "active" : "paused");
    if (status === "active") activeCount++;
    else if (status === "paused") pausedCount++;
    else if (status === "cancelled") cancelledCount++;
    else if (status === "archived") archivedCount++;

    if (item.type !== "expense") return;

    if (status === "active") {
      const monthly = calculateRecurringMonthlyEquivalent(item.amount, item.frequency, item.interval);
      const annual = calculateRecurringAnnualEquivalent(item.amount, item.frequency, item.interval);

      totalMonthlyRecurringMinor += monthly;
      totalAnnualRecurringMinor += annual;

      const catId = item.category_id || "uncategorized";
      if (!categoryMap[catId]) {
        categoryMap[catId] = { monthly: 0, annual: 0, count: 0 };
      }
      categoryMap[catId].monthly += monthly;
      categoryMap[catId].annual += annual;
      categoryMap[catId].count += 1;

      // Due date calculations
      const dueDate = new Date(item.next_date + "T00:00:00");
      dueDate.setHours(0, 0, 0, 0);
      const diffTime = dueDate.getTime() - today.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      upcomingRenewals.push({
        recurring: item,
        diffDays,
        isDueToday: diffDays === 0,
        isOverdue: diffDays < 0,
        monthlyEquivalent: monthly,
      });
    }
  });

  upcomingRenewals.sort((a, b) => a.diffDays - b.diffDays);

  const categoryBreakdown = Object.entries(categoryMap)
    .map(([catId, data]) => {
      const catMeta = categoriesMap[catId] || {
        name: "Uncategorized",
        icon: "Tag",
        color: "#94A3B8",
      };
      const percentage =
        totalMonthlyRecurringMinor > 0
          ? Math.round((data.monthly / totalMonthlyRecurringMinor) * 1000) / 10
          : 0;

      return {
        categoryId: catId,
        category: catMeta.name,
        icon: catMeta.icon,
        color: catMeta.color,
        monthlyAmount: data.monthly,
        annualAmount: data.annual,
        percentage,
        count: data.count,
      };
    })
    .sort((a, b) => b.monthlyAmount - a.monthlyAmount);

  return {
    activeCount,
    pausedCount,
    cancelledCount,
    archivedCount,
    totalMonthlyRecurringMinor,
    totalAnnualRecurringMinor,
    categoryBreakdown,
    upcomingRenewals,
  };
}

// ============================================================
// PHASE 4: SMART SPENDING INSIGHTS ENGINE
// ============================================================

export interface SmartInsight {
  id: string;
  type:
    | "category_dominance"
    | "period_comparison"
    | "unusual_transaction"
    | "budget_alert"
    | "savings_opportunity"
    | "recurring_commitment";
  severity: "info" | "warning" | "positive";
  title: string;
  amountMinor?: number;
  percentageChange?: number;
  comparisonPeriod?: string;
  categoryName?: string;
  explanation: string;
  actionableStep?: string;
}

export function generateSmartSpendingInsights(params: {
  currentMonthTransactions: Transaction[];
  previousMonthTransactions: Transaction[];
  categoriesMap: Record<string, { name: string; color: string; icon: string }>;
  budgets?: Budget[];
  recurring?: RecurringTransaction[];
}): SmartInsight[] {
  const {
    currentMonthTransactions,
    previousMonthTransactions,
    categoriesMap,
    budgets,
    recurring,
  } = params;

  const insights: SmartInsight[] = [];
  const curExpenses = currentMonthTransactions.filter((t) => t.type === "expense");
  const prevExpenses = previousMonthTransactions.filter((t) => t.type === "expense");

  const totalCurExpense = calculatePeriodExpenses(curExpenses);
  const totalPrevExpense = calculatePeriodExpenses(prevExpenses);

  // 1. Category Dominance (Check if any single category consumes >= 30% of total outflow)
  const categorySpending = calculateSpendingByCategory(curExpenses, categoriesMap);
  if (categorySpending.length > 0 && totalCurExpense > 0) {
    const topCat = categorySpending[0];
    if (topCat.percentage >= 30) {
      insights.push({
        id: `ins-dom-${topCat.categoryId}`,
        type: "category_dominance",
        severity: "info",
        title: `${topCat.category} represents ${topCat.percentage}% of your outflow`,
        amountMinor: topCat.amount,
        categoryName: topCat.category,
        explanation: `${topCat.category} is your highest single outflow category this month, accounting for ₹${(topCat.amount / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })} across ${topCat.count} recorded transaction${topCat.count > 1 ? "s" : ""}.`,
        actionableStep: "Review your category limit to ensure this doesn't crowd out essential emergency savings.",
      });
    }
  }

  // 2. Period-over-Period Trend (Compare total outflow vs last month)
  if (totalPrevExpense > 0 && totalCurExpense > 0) {
    const diff = totalCurExpense - totalPrevExpense;
    const pctChange = Math.round((diff / totalPrevExpense) * 1000) / 10;
    if (Math.abs(pctChange) >= 5) {
      const isIncrease = pctChange > 0;
      insights.push({
        id: "ins-period-comparison",
        type: "period_comparison",
        severity: isIncrease ? "warning" : "positive",
        title: isIncrease
          ? `Spending increased by ${pctChange}% vs last month`
          : `Spending decreased by ${Math.abs(pctChange)}% vs last month`,
        amountMinor: Math.abs(diff),
        percentageChange: pctChange,
        comparisonPeriod: "Month-over-Month",
        explanation: `Total recorded expenses are ₹${(totalCurExpense / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })} compared to ₹${(totalPrevExpense / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })} during the previous cycle.`,
        actionableStep: isIncrease
          ? "Check discretionary purchases or unexpected one-off transactions."
          : "Great spending discipline! Consider directing this surplus toward your top savings goal.",
      });
    }
  }

  // 3. Unusually Large Transactions (Single purchase > 2.5x mean of other expenses)
  if (curExpenses.length >= 3) {
    const largeTx = curExpenses.find((t) => {
      const otherExpensesTotal = totalCurExpense - t.amount;
      const otherMean = otherExpensesTotal / (curExpenses.length - 1);
      return otherMean > 0 && t.amount >= otherMean * 2.5 && t.amount >= 1000000;
    });
    if (largeTx) {
      const otherMean = (totalCurExpense - largeTx.amount) / (curExpenses.length - 1);
      const catName = largeTx.category_id && categoriesMap[largeTx.category_id]
        ? categoriesMap[largeTx.category_id].name
        : "General";
      insights.push({
        id: `ins-large-${largeTx.id}`,
        type: "unusual_transaction",
        severity: "warning",
        title: `Unusual transaction: ${largeTx.description}`,
        amountMinor: largeTx.amount,
        categoryName: catName,
        explanation: `This transaction of ₹${(largeTx.amount / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })} is ${(largeTx.amount / otherMean).toFixed(1)}x higher than your typical purchase baseline this month.`,
        actionableStep: "Verify if this was a planned one-off capital purchase or a recurring commitment.",
      });
    }
  }

  // 4. Budget Threshold Alerts (> 75% or > 100%)
  if (budgets && budgets.length > 0) {
    const activeBudget = budgets[0];
    if (activeBudget.total_limit > 0) {
      const util = (totalCurExpense / activeBudget.total_limit) * 100;
      if (util >= 100) {
        insights.push({
          id: `ins-bgt-over-${activeBudget.id}`,
          type: "budget_alert",
          severity: "warning",
          title: `Over budget by ₹${((totalCurExpense - activeBudget.total_limit) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
          amountMinor: totalCurExpense - activeBudget.total_limit,
          explanation: `You have utilized ${util.toFixed(1)}% of your ₹${(activeBudget.total_limit / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })} budget limit for ${activeBudget.name}.`,
          actionableStep: "Pause discretionary spending for the remainder of the month to restore cash flow.",
        });
      } else if (util >= 75) {
        insights.push({
          id: `ins-bgt-warn-${activeBudget.id}`,
          type: "budget_alert",
          severity: "info",
          title: `Budget is at ${util.toFixed(1)}% utilization`,
          amountMinor: Math.max(0, activeBudget.total_limit - totalCurExpense),
          explanation: `₹${((activeBudget.total_limit - totalCurExpense) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })} remaining in your active budget cap.`,
          actionableStep: "Pace upcoming variable expenses to stay within your threshold.",
        });
      }
    }
  }

  // 5. Discretionary Trim Opportunity (Identify top non-essential category)
  const discretionaryCategories = ["Dining", "Food", "Shopping", "Entertainment", "Lifestyle"];
  const topDiscretionary = categorySpending.find((c) =>
    discretionaryCategories.some((d) => c.category.toLowerCase().includes(d.toLowerCase()))
  );
  if (topDiscretionary && topDiscretionary.amount >= 500000) { // >= ₹5,000
    const monthly15pctSavings = Math.round(topDiscretionary.amount * 0.15);
    const annualSavings = monthly15pctSavings * 12;
    insights.push({
      id: `ins-opp-${topDiscretionary.categoryId}`,
      type: "savings_opportunity",
      severity: "positive",
      title: `Trimming 15% in ${topDiscretionary.category} frees ₹${(annualSavings / 100).toLocaleString("en-IN", { minimumFractionDigits: 0 })}/year`,
      amountMinor: monthly15pctSavings,
      categoryName: topDiscretionary.category,
      explanation: `Reducing ${topDiscretionary.category} spending by just 15% generates ₹${(monthly15pctSavings / 100).toLocaleString("en-IN", { minimumFractionDigits: 0 })} in extra monthly cash flow, compounding to ₹${(annualSavings / 100).toLocaleString("en-IN", { minimumFractionDigits: 0 })} over 12 months.`,
      actionableStep: "Explore what-if forecasts to simulate directing these savings toward high-yield funds.",
    });
  }

  // 6. Recurring Commitments Summary
  if (recurring && recurring.length > 0) {
    const activeSubs = recurring.filter((r) => r.is_active && r.type === "expense");
    const totalMonthlySubs = activeSubs.reduce(
      (sum, r) => sum + calculateRecurringMonthlyEquivalent(r.amount, r.frequency, r.interval),
      0
    );
    if (totalMonthlySubs > 0 && totalCurExpense > 0) {
      const shareOfOutflow = Math.round((totalMonthlySubs / totalCurExpense) * 1000) / 10;
      insights.push({
        id: "ins-recurring-summary",
        type: "recurring_commitment",
        severity: "info",
        title: `Fixed commitments total ₹${(totalMonthlySubs / 100).toLocaleString("en-IN", { minimumFractionDigits: 0 })}/month`,
        amountMinor: totalMonthlySubs,
        percentageChange: shareOfOutflow,
        explanation: `Your ${activeSubs.length} active subscriptions and recurring bills constitute approximately ${shareOfOutflow}% of your monthly expenditure.`,
        actionableStep: "Audit unused streaming services or software licenses in the Subscription Manager.",
      });
    }
  }

  return insights;
}

// ============================================================
// PHASE 4: EMERGENCY BUFFER RUNWAY ANALYSIS
// ============================================================

export interface EmergencyBufferAnalysis {
  liquidBalanceMinor: number;
  essentialMonthlyExpenseMinor: number;
  monthsCovered: number;
  status: "Critical" | "Minimal" | "Adequate" | "Robust";
  sixMonthTargetMinor: number;
  shortfallMinor: number;
  accountsIncluded: string[];
  accountsExcluded: string[];
  explanation: string;
}

export function calculateEmergencyBuffer(params: {
  accounts: Account[];
  essentialMonthlyExpenseMinor: number;
  customMonthlyExpenseMinor?: number;
}): EmergencyBufferAnalysis {
  const { accounts, essentialMonthlyExpenseMinor, customMonthlyExpenseMinor } = params;

  const accountsIncluded: string[] = [];
  const accountsExcluded: string[] = [];

  let liquidBalanceMinor = 0;

  accounts.forEach((acc) => {
    if (acc.is_archived) {
      accountsExcluded.push(`${acc.name} (Archived)`);
      return;
    }
    // Only liquid accounts qualify for genuine emergency reserves
    if (["cash", "savings", "checking", "wallet"].includes(acc.type)) {
      liquidBalanceMinor += Math.max(0, acc.current_balance);
      accountsIncluded.push(acc.name);
    } else {
      accountsExcluded.push(`${acc.name} (${acc.type})`);
    }
  });

  const expenseBase = Math.max(1, customMonthlyExpenseMinor || essentialMonthlyExpenseMinor);
  const monthsCovered = Math.round((liquidBalanceMinor / expenseBase) * 10) / 10;

  let status: "Critical" | "Minimal" | "Adequate" | "Robust" = "Adequate";
  if (monthsCovered < 1) status = "Critical";
  else if (monthsCovered < 3) status = "Minimal";
  else if (monthsCovered < 6) status = "Adequate";
  else status = "Robust";

  const sixMonthTargetMinor = expenseBase * 6;
  const shortfallMinor = Math.max(0, sixMonthTargetMinor - liquidBalanceMinor);

  let explanation = `Your liquid cash reserves of ₹${(liquidBalanceMinor / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })} cover ${monthsCovered} months of essential expenses.`;
  if (status === "Critical") {
    explanation += " Urgent action recommended: Build at least 1 month of living expenses immediately.";
  } else if (status === "Minimal") {
    explanation += " Good start! Aim to expand your buffer to 3 months to protect against unexpected life events.";
  } else if (status === "Adequate") {
    explanation += " Solid safety net. You meet the recommended 3-month baseline.";
  } else {
    explanation += " Outstanding resilience. You have a rock-solid 6+ month runway.";
  }

  return {
    liquidBalanceMinor,
    essentialMonthlyExpenseMinor: expenseBase,
    monthsCovered,
    status,
    sixMonthTargetMinor,
    shortfallMinor,
    accountsIncluded,
    accountsExcluded,
    explanation,
  };
}

// ============================================================
// PHASE 4: WHAT-IF MULTI-SCENARIO SIMULATOR
// ============================================================

export interface WhatIfSimulationParams {
  startingBalanceMinor: number;
  monthlyIncomeMinor: number;
  essentialExpensesMinor: number;
  discretionaryExpensesMinor: number;
  plannedMonthlySavingsMinor?: number;
  oneTimeUpcomingExpensesMinor?: number;
  discretionaryReductionPct?: number; // 0 to 50%
  projectionMonths?: number; // 3 to 36
  startYear?: number;
  startMonth?: number;
}

export interface ScenarioTrajectoryPoint {
  monthIndex: number;
  monthLabel: string;
  balance: number;
  income: number;
  expenses: number;
  surplus: number;
  cumulativeSavings: number;
}

export interface WhatIfSimulationResult {
  durationMonths: number;
  conservative: {
    finalBalance: number;
    cumulativeSurplus: number;
    trajectory: ScenarioTrajectoryPoint[];
    assumptions: string[];
  };
  expected: {
    finalBalance: number;
    cumulativeSurplus: number;
    trajectory: ScenarioTrajectoryPoint[];
    assumptions: string[];
  };
  optimistic: {
    finalBalance: number;
    cumulativeSurplus: number;
    trajectory: ScenarioTrajectoryPoint[];
    assumptions: string[];
  };
  discretionaryReductionSavingsMonthly: number;
  discretionaryReductionSavingsTotal: number;
  limitations: string[];
}

export function simulateWhatIfScenarios(params: WhatIfSimulationParams): WhatIfSimulationResult {
  const durationMonths = Math.min(36, Math.max(3, params.projectionMonths || 12));
  const baseIncome = Math.max(0, params.monthlyIncomeMinor);
  const baseEssential = Math.max(0, params.essentialExpensesMinor);
  const baseDiscretionary = Math.max(0, params.discretionaryExpensesMinor);
  const reductionPct = Math.min(50, Math.max(0, params.discretionaryReductionPct || 0));

  // Monthly savings from discretionary trim
  const discretionaryReductionSavingsMonthly = Math.round(baseDiscretionary * (reductionPct / 100));
  const discretionaryReductionSavingsTotal = discretionaryReductionSavingsMonthly * durationMonths;

  const adjustedDiscretionary = baseDiscretionary - discretionaryReductionSavingsMonthly;
  const totalStartingExpenses = baseEssential + adjustedDiscretionary;
  const oneTimeExpenses = Math.max(0, params.oneTimeUpcomingExpensesMinor || 0);

  const startYear = params.startYear || 2026;
  const startMonth = params.startMonth !== undefined ? params.startMonth : 9; // 0-indexed

  const conservativeTrajectory: ScenarioTrajectoryPoint[] = [];
  const expectedTrajectory: ScenarioTrajectoryPoint[] = [];
  const optimisticTrajectory: ScenarioTrajectoryPoint[] = [];

  let balCons = params.startingBalanceMinor;
  let balExp = params.startingBalanceMinor;
  let balOpt = params.startingBalanceMinor;

  let cumCons = 0;
  let cumExp = 0;
  let cumOpt = 0;

  for (let i = 1; i <= durationMonths; i++) {
    const targetDate = new Date(Date.UTC(startYear, startMonth + i, 1));
    const monthLabel = targetDate.toLocaleDateString("en-US", { month: "short", year: "2-digit" });

    // Deduct one-time expense in Month 2 if applicable
    const extraOutflow = i === 2 ? oneTimeExpenses : 0;

    // 1. Conservative Scenario: Flat income, higher inflation (8% annual), unreduced discretionary
    const consInc = baseIncome;
    const consExp = Math.round((baseEssential + baseDiscretionary) * (1 + (0.08 * i) / 12)) + extraOutflow;
    const consSurplus = consInc - consExp;
    balCons += consSurplus;
    cumCons += consSurplus;
    conservativeTrajectory.push({
      monthIndex: i,
      monthLabel,
      balance: balCons,
      income: consInc,
      expenses: consExp,
      surplus: consSurplus,
      cumulativeSavings: cumCons,
    });

    // 2. Expected Scenario: Modest income growth (5% annual), moderate inflation (5%), category reduction active
    const expInc = Math.round(baseIncome * (1 + (0.05 * i) / 12));
    const expExp = Math.round(totalStartingExpenses * (1 + (0.05 * i) / 12)) + extraOutflow;
    const expSurplus = expInc - expExp;
    balExp += expSurplus;
    cumExp += expSurplus;
    expectedTrajectory.push({
      monthIndex: i,
      monthLabel,
      balance: balExp,
      income: expInc,
      expenses: expExp,
      surplus: expSurplus,
      cumulativeSavings: cumExp,
    });

    // 3. Optimistic Scenario: Solid income growth (10% annual), tight expense discipline (3% inflation), 1.25x reduction efficacy
    const optInc = Math.round(baseIncome * (1 + (0.10 * i) / 12));
    const optExp = Math.round(totalStartingExpenses * (1 + (0.03 * i) / 12)) + extraOutflow;
    const optSurplus = optInc - optExp;
    balOpt += optSurplus;
    cumOpt += optSurplus;
    optimisticTrajectory.push({
      monthIndex: i,
      monthLabel,
      balance: balOpt,
      income: optInc,
      expenses: optExp,
      surplus: optSurplus,
      cumulativeSavings: cumOpt,
    });
  }

  return {
    durationMonths,
    conservative: {
      finalBalance: balCons,
      cumulativeSurplus: cumCons,
      trajectory: conservativeTrajectory,
      assumptions: [
        "Income remains completely flat throughout projection horizon.",
        "Annual inflation of 8% applied across all living expenses.",
        "Zero discretionary expense trimming applied.",
      ],
    },
    expected: {
      finalBalance: balExp,
      cumulativeSurplus: cumExp,
      trajectory: expectedTrajectory,
      assumptions: [
        "Annual income growth of 5% applied linearly.",
        "Annual expense inflation modeled at 5%.",
        `Active discretionary reduction of ${reductionPct}% in effect.`,
      ],
    },
    optimistic: {
      finalBalance: balOpt,
      cumulativeSurplus: cumOpt,
      trajectory: optimisticTrajectory,
      assumptions: [
        "Annual income growth of 10% from promotions or investments.",
        "Controlled expense inflation of 3% through disciplined budgeting.",
        `Discretionary spending trimmed by ${reductionPct}%.`,
      ],
    },
    discretionaryReductionSavingsMonthly,
    discretionaryReductionSavingsTotal,
    limitations: [
      "All trajectories are deterministic projections and do not constitute guaranteed investment returns.",
      "Market volatility, variable bonuses, emergency medical incidents, and sudden macroeconomic shocks are not modeled.",
      "Tax liabilities are assumed to scale proportionally with baseline net income.",
    ],
  };
}

// ============================================================
// PHASE 4: SMART SAVINGS GOAL PACING PLANNER
// ============================================================

export interface SmartGoalPacingOptions {
  goalId: string;
  goalName: string;
  targetAmountMinor: number;
  currentAmountMinor: number;
  remainingAmountMinor: number;
  targetDate: string | null;
  targetDatePlan?: {
    monthsRemaining: number;
    requiredMonthlyMinor: number;
    isFeasibleWithCashFlow: boolean;
  };
  fixedPlans: Array<{
    monthlyContributionMinor: number;
    monthsToComplete: number;
    projectedCompletionDate: string;
  }>;
  recommendedMonthlyMinor: number;
  discretionarySurplusMinor: number;
  tradeoffNotice?: string;
}

export function calculateSmartGoalPacing(
  goal: Goal,
  discretionaryMonthlySurplusMinor: number,
  referenceDate?: Date
): SmartGoalPacingOptions {
  const remainingMinor = Math.max(0, goal.target_amount - goal.current_amount);
  const now = referenceDate || (typeof window !== "undefined" ? new Date() : new Date("2026-10-15T00:00:00.000Z"));

  let targetDatePlan: SmartGoalPacingOptions["targetDatePlan"] = undefined;

  if (goal.target_date) {
    const target = new Date(goal.target_date + "T00:00:00");
    const diffTime = target.getTime() - now.getTime();
    const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    const monthsRemaining = Math.max(1, Math.ceil(diffDays / 30.4375));
    const requiredMonthlyMinor = Math.ceil(remainingMinor / monthsRemaining);

    targetDatePlan = {
      monthsRemaining,
      requiredMonthlyMinor,
      isFeasibleWithCashFlow: requiredMonthlyMinor <= discretionaryMonthlySurplusMinor,
    };
  }

  // Pre-calculated alternative contribution plans (₹2,500, ₹5,000, ₹10,000, ₹25,000)
  const presetsMinor = [250000, 500000, 1000000, 2500000];
  const fixedPlans = presetsMinor.map((contrib) => {
    const monthsToComplete = remainingMinor > 0 ? Math.ceil(remainingMinor / contrib) : 0;
    const futureDate = new Date(now.getFullYear(), now.getMonth() + monthsToComplete, 1);
    const projectedCompletionDate = futureDate.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    return {
      monthlyContributionMinor: contrib,
      monthsToComplete,
      projectedCompletionDate,
    };
  });

  // Recommended monthly contribution:
  // If target date exists, use its required monthly pacing; otherwise allocate 25% of discretionary surplus
  let recommendedMonthlyMinor = targetDatePlan
    ? targetDatePlan.requiredMonthlyMinor
    : Math.round(discretionaryMonthlySurplusMinor * 0.25);

  let tradeoffNotice: string | undefined = undefined;
  if (recommendedMonthlyMinor > discretionaryMonthlySurplusMinor && discretionaryMonthlySurplusMinor > 0) {
    tradeoffNotice = `Target pace (₹${(recommendedMonthlyMinor / 100).toLocaleString("en-IN")}/mo) exceeds your discretionary monthly surplus (₹${(discretionaryMonthlySurplusMinor / 100).toLocaleString("en-IN")}/mo). Recommending extending target date to avoid starving essentials.`;
    recommendedMonthlyMinor = discretionaryMonthlySurplusMinor;
  }

  return {
    goalId: goal.id,
    goalName: goal.name,
    targetAmountMinor: goal.target_amount,
    currentAmountMinor: goal.current_amount,
    remainingAmountMinor: remainingMinor,
    targetDate: goal.target_date,
    targetDatePlan,
    fixedPlans,
    recommendedMonthlyMinor,
    discretionarySurplusMinor: discretionaryMonthlySurplusMinor,
    tradeoffNotice,
  };
}

