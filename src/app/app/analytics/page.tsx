"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Download,
  Info,
  Lightbulb,
  Sparkles,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { fyzaStore } from "@/lib/store";
import {
  calculateTotalBalance,
  calculatePeriodIncome,
  calculatePeriodExpenses,
  calculateNetCashFlow,
  calculateSavingsRate,
  calculateSpendingByCategory,
  calculateFinancialHealthScore,
  generateSmartSpendingInsights,
} from "@/lib/calculations";
import { formatCurrency } from "@/lib/utils";
import type { Transaction, Category, Budget, RecurringTransaction, Account } from "@/lib/types";
import { toast } from "sonner";

export default function AnalyticsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [recurring, setRecurring] = useState<RecurringTransaction[]>([]);
  const [period, setPeriod] = useState<"this_month" | "last_month" | "all_time">("this_month");
  const [insightFilter, setInsightFilter] = useState<string>("all");
  const [currentPrefix, setCurrentPrefix] = useState("2026-10");
  const [prevPrefix, setPrevPrefix] = useState("2026-09");

  const loadData = () => {
    setAccounts(fyzaStore.getAccounts());
    setTransactions(fyzaStore.getTransactions());
    setCategories(fyzaStore.getCategories());
    setBudgets(fyzaStore.getBudgets());
    setRecurring(fyzaStore.getRecurringTransactions());
  };

  useEffect(() => {
    loadData();
    const d = new Date();
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    setCurrentPrefix(`${y}-${String(m).padStart(2, "0")}`);
    const py = m === 1 ? y - 1 : y;
    const pm = m === 1 ? 12 : m - 1;
    setPrevPrefix(`${py}-${String(pm).padStart(2, "0")}`);

    window.addEventListener("fyza_store_updated", loadData);
    return () => window.removeEventListener("fyza_store_updated", loadData);
  }, []);

  const curMonthTxs = useMemo(() => {
    return transactions.filter((t) => t.transaction_date.startsWith(currentPrefix));
  }, [transactions, currentPrefix]);

  const prevMonthTxs = useMemo(() => {
    return transactions.filter((t) => t.transaction_date.startsWith(prevPrefix));
  }, [transactions, prevPrefix]);

  const filteredTransactions = useMemo(() => {
    if (period === "this_month") return curMonthTxs;
    if (period === "last_month") return prevMonthTxs;
    return transactions;
  }, [transactions, curMonthTxs, prevMonthTxs, period]);

  const totalIncome = calculatePeriodIncome(filteredTransactions);
  const totalExpenses = calculatePeriodExpenses(filteredTransactions);
  const netCashFlow = calculateNetCashFlow(totalIncome, totalExpenses);
  const savingsRate = calculateSavingsRate(totalIncome, totalExpenses);
  const totalLiquidBalance = calculateTotalBalance(accounts);

  const categoriesMap = useMemo(() => {
    return categories.reduce<Record<string, { name: string; icon: string; color: string }>>((acc, c) => {
      acc[c.id] = { name: c.name, icon: c.icon, color: c.color };
      return acc;
    }, {});
  }, [categories]);

  const spendingByCategory = useMemo(() => {
    return calculateSpendingByCategory(
      filteredTransactions.filter((t) => t.type === "expense"),
      categoriesMap
    );
  }, [filteredTransactions, categoriesMap]);

  // Phase 4: Smart Spending Insights Engine
  const smartInsights = useMemo(() => {
    return generateSmartSpendingInsights({
      currentMonthTransactions: curMonthTxs,
      previousMonthTransactions: prevMonthTxs,
      categoriesMap,
      budgets,
      recurring,
    });
  }, [curMonthTxs, prevMonthTxs, categoriesMap, budgets, recurring]);

  const filteredInsights = useMemo(() => {
    if (insightFilter === "all") return smartInsights;
    if (insightFilter === "warnings") return smartInsights.filter((i) => i.severity === "warning");
    if (insightFilter === "opportunities") return smartInsights.filter((i) => i.type === "savings_opportunity" || i.severity === "positive");
    return smartInsights;
  }, [smartInsights, insightFilter]);

  // Phase 5: Transparent Financial Health Score
  const healthScore = useMemo(() => {
    const activeBudget = budgets[0];
    return calculateFinancialHealthScore({
      monthlyIncomeMinor: totalIncome,
      monthlyExpenseMinor: totalExpenses,
      totalLiquidBalanceMinor: totalLiquidBalance,
      budgetLimitMinor: activeBudget?.total_limit,
      budgetSpentMinor: totalExpenses,
    });
  }, [totalIncome, totalExpenses, totalLiquidBalance, budgets]);

  const handleExportReport = () => {
    const report = {
      period,
      generated_at: new Date().toISOString(),
      summary: {
        total_income_minor: totalIncome,
        total_expenses_minor: totalExpenses,
        net_cash_flow_minor: netCashFlow,
        savings_rate_pct: savingsRate,
        liquid_balance_minor: totalLiquidBalance,
      },
      health_score: healthScore,
      smart_insights: smartInsights,
      category_breakdown: spendingByCategory,
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `fyza_intelligence_report_${period}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Intelligence report exported.");
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Financial Analytics
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Spending insights, financial health scoring, and cash-flow trends.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={(val: "this_month" | "last_month" | "all_time") => setPeriod(val)}>
            <SelectTrigger className="w-36 h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this_month">This Month</SelectItem>
              <SelectItem value="last_month">Last Month</SelectItem>
              <SelectItem value="all_time">All Time</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportReport}
            className="text-xs flex items-center gap-1.5"
          >
            <Download className="h-3.5 w-3.5" /> Export Report
          </Button>
        </div>
      </div>

      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
              Total Inflow
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-extrabold text-emerald-400">
              {formatCurrency(totalIncome, "INR")}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">Excludes inter-account transfers</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
              Total Outflow
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-extrabold text-rose-400">
              {formatCurrency(totalExpenses, "INR")}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">Total operating & living expenses</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
              Net Cash Flow
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-extrabold ${netCashFlow >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {netCashFlow >= 0 ? "+" : ""}
              {formatCurrency(netCashFlow, "INR")}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">Net liquid surplus added</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
              Savings Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-extrabold text-cyan-400">
              {savingsRate}%
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">(Income − Outflow) / Income</p>
          </CardContent>
        </Card>
      </div>

      {/* PART 5: FINANCIAL HEALTH SCORE SECTION */}
      <Card className="border-primary/25 bg-gradient-to-r from-card to-surface">
        <CardHeader className="pb-3 border-b border-border/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Financial Health Score
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Comprehensive 0–100 score based on 4 key budgeting and savings metrics.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  healthScore.rating === "Excellent"
                    ? "default"
                    : healthScore.rating === "Good"
                    ? "info"
                    : "warning"
                }
                className="text-xs font-bold px-3 py-1"
              >
                {healthScore.rating} ({healthScore.totalScore}/100)
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-surface border border-border">
              <p className="text-[11px] text-muted-foreground">1. Savings Rate</p>
              <p className="text-lg font-bold text-foreground mt-0.5">
                {healthScore.breakdown.savingsRateScore} <span className="text-xs text-muted-foreground font-normal">/ 35 pts</span>
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Threshold: 20%+ for top score</p>
            </div>

            <div className="p-3 rounded-xl bg-surface border border-border">
              <p className="text-[11px] text-muted-foreground">2. Budget Adherence</p>
              <p className="text-lg font-bold text-foreground mt-0.5">
                {healthScore.breakdown.budgetScore} <span className="text-xs text-muted-foreground font-normal">/ 25 pts</span>
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Spent vs allocated limits</p>
            </div>

            <div className="p-3 rounded-xl bg-surface border border-border">
              <p className="text-[11px] text-muted-foreground">3. Emergency Buffer</p>
              <p className="text-lg font-bold text-foreground mt-0.5">
                {healthScore.breakdown.emergencyBufferScore} <span className="text-xs text-muted-foreground font-normal">/ 25 pts</span>
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Months of essential burn</p>
            </div>

            <div className="p-3 rounded-xl bg-surface border border-border">
              <p className="text-[11px] text-muted-foreground">4. Positive Cash Flow</p>
              <p className="text-lg font-bold text-foreground mt-0.5">
                {healthScore.breakdown.cashFlowScore} <span className="text-xs text-muted-foreground font-normal">/ 15 pts</span>
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Inflow exceeds outflow</p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-surface-secondary border border-border/80 flex items-start gap-2.5 text-xs text-muted-foreground">
            <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-semibold text-foreground">Health Model Disclaimers:</p>
              <p>
                {healthScore.insights.join(" ")} This score is an informational budgeting metric based on your recorded ledger. It is <strong>NOT a credit score</strong> or an official measure of creditworthiness.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PART 2: SMART SPENDING INSIGHTS ENGINE */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Smart Spending Insights
              <span className="text-[10px] font-semibold text-muted-foreground">
                ({filteredInsights.length} detected)
              </span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Explainable observations computed strictly from verified transactions and category patterns.
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant={insightFilter === "all" ? "default" : "outline"}
              onClick={() => setInsightFilter("all")}
              className="text-xs h-7 px-2.5"
            >
              All
            </Button>
            <Button
              size="sm"
              variant={insightFilter === "warnings" ? "default" : "outline"}
              onClick={() => setInsightFilter("warnings")}
              className="text-xs h-7 px-2.5"
            >
              Alerts
            </Button>
            <Button
              size="sm"
              variant={insightFilter === "opportunities" ? "default" : "outline"}
              onClick={() => setInsightFilter("opportunities")}
              className="text-xs h-7 px-2.5"
            >
              Opportunities
            </Button>
          </div>
        </div>

        {filteredInsights.length === 0 ? (
          <Card className="p-6 text-center text-xs text-muted-foreground">
            No spending anomalies or warnings detected for this filter. Your transactions are running within baseline boundaries.
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredInsights.map((ins) => (
              <Card
                key={ins.id}
                className={`transition-all border ${
                  ins.severity === "warning"
                    ? "border-amber-500/30 bg-amber-500/5 hover:border-amber-500/50"
                    : ins.severity === "positive"
                    ? "border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/50"
                    : "border-primary/30 bg-primary/5 hover:border-primary/50"
                }`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <Badge
                      variant={
                        ins.severity === "warning"
                          ? "warning"
                          : ins.severity === "positive"
                          ? "default"
                          : "info"
                      }
                      className="text-[10px] font-bold"
                    >
                      {ins.type.replace("_", " ").toUpperCase()}
                    </Badge>
                    {ins.amountMinor && (
                      <span className="text-xs font-mono font-bold text-foreground">
                        {formatCurrency(ins.amountMinor, "INR")}
                      </span>
                    )}
                  </div>
                  <CardTitle className="text-sm font-bold text-foreground mt-1.5">
                    {ins.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs text-muted-foreground leading-relaxed">
                  <p>{ins.explanation}</p>
                  {ins.actionableStep && (
                    <div className="p-2.5 rounded-lg bg-surface border border-border/80 text-[11px] text-foreground flex items-start gap-2">
                      <Lightbulb className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                      <span>
                        <strong>Actionable Step:</strong> {ins.actionableStep}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Two Column Layout: Category Distribution & Visual Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown Table */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base font-bold">Category Distribution</CardTitle>
            <p className="text-xs text-muted-foreground">Breakdown of outflows by spending category</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {spendingByCategory.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">
                No expense transactions recorded in this period.
              </p>
            ) : (
              spendingByCategory.map((item) => (
                <div key={item.categoryId} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-foreground">{item.category}</span>
                    <span className="font-semibold text-foreground">
                      {formatCurrency(item.amount, "INR")} ({item.percentage}%)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-surface-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${item.percentage}%`,
                        backgroundColor: item.color || "#48D6A0",
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Visual Cash Flow Comparison */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base font-bold">Cash Flow Comparison</CardTitle>
            <p className="text-xs text-muted-foreground">Relative ratio of income vs expenses</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-emerald-400">Total Income</span>
                <span className="font-bold text-foreground">
                  {formatCurrency(totalIncome, "INR")}
                </span>
              </div>
              <div className="h-4 w-full bg-surface-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-400 rounded-full"
                  style={{ width: "100%" }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-rose-400">Total Expenses</span>
                <span className="font-bold text-foreground">
                  {formatCurrency(totalExpenses, "INR")}
                </span>
              </div>
              <div className="h-4 w-full bg-surface-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-rose-400 rounded-full"
                  style={{
                    width: totalIncome > 0 ? `${Math.min(100, (totalExpenses / totalIncome) * 100)}%` : "0%",
                  }}
                />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-surface border border-border space-y-1">
              <p className="text-xs font-semibold text-foreground">Operating Ratio</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                You are spending{" "}
                <span className="font-bold text-foreground">
                  {totalIncome > 0 ? ((totalExpenses / totalIncome) * 100).toFixed(1) : 0}%
                </span>{" "}
                of every rupee earned, retaining the remaining{" "}
                <span className="font-bold text-primary">{savingsRate}%</span> as liquid surplus.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

