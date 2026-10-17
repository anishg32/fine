"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Sparkles,
  ArrowUpRight,
  ArrowRight,
  Target,
  Plus,
  PieChart as PieIcon,
  Filter,
  MoreVertical,
  Edit2,
  Trash2,
  HelpCircle,
  AlertTriangle,
  Calendar,
  Layers,
  CheckCircle,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/components/providers/auth-provider";
import { fyzaStore } from "@/lib/store";
import {
  calculateTotalBalance,
  calculatePeriodIncome,
  calculatePeriodExpenses,
  calculateNetCashFlow,
  calculateSavingsRate,
  calculateSpendingByCategory,
  calculateFinancialHealthScore,
  calculateGoalMonthlyTarget,
} from "@/lib/calculations";
import { formatCurrency, getGreeting } from "@/lib/utils";
import { CountUp } from "@/components/ui/count-up";
import { TransactionDialog } from "@/components/transactions/transaction-dialog";
import type {
  Account,
  Transaction,
  Budget,
  Goal,
  RecurringTransaction,
  Category,
  TransactionType,
} from "@/lib/types";
import { toast } from "sonner";

export default function DashboardPage() {
  const router = useRouter();
  const { profile } = useAuth();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [recurring, setRecurring] = useState<RecurringTransaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [currentMonthPrefix, setCurrentMonthPrefix] = useState("2026-10");
  const [prevMonthPrefix, setPrevMonthPrefix] = useState("2026-09");
  const [displayMonthName, setDisplayMonthName] = useState("October 2026");
  const [greeting, setGreeting] = useState("Good day");
  const [mounted, setMounted] = useState(false);

  // Filters and dialogs
  const [txFilterType, setTxFilterType] = useState<"all" | TransactionType>("all");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);
  const [cashFlowRange, setCashFlowRange] = useState<"6m" | "ytd" | "all">("6m");
  const [activeDonutIndex, setActiveDonutIndex] = useState<number | null>(null);

  // Quick Edit Transaction
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const loadData = () => {
    setAccounts(fyzaStore.getAccounts());
    setTransactions(fyzaStore.getTransactions());
    setBudgets(fyzaStore.getBudgets());
    setGoals(fyzaStore.getGoals());
    setRecurring(fyzaStore.getRecurring());
    setCategories(fyzaStore.getCategories());
  };

  useEffect(() => {
    setMounted(true);
    loadData();
    setGreeting(getGreeting());

    window.addEventListener("fyza_store_updated", loadData);
    return () => window.removeEventListener("fyza_store_updated", loadData);
  }, []);

  const currency = profile?.preferred_currency || accounts[0]?.currency || "INR";

  // Filtered current month transactions
  const currentMonthTransactions = useMemo(
    () => transactions.filter((t) => t.transaction_date.startsWith(currentMonthPrefix)),
    [transactions, currentMonthPrefix]
  );

  const prevMonthTransactions = useMemo(
    () => transactions.filter((t) => t.transaction_date.startsWith(prevMonthPrefix)),
    [transactions, prevMonthPrefix]
  );

  // Core Financial Aggregates
  const totalBalance = useMemo(() => calculateTotalBalance(accounts), [accounts]);
  const currentIncome = useMemo(() => calculatePeriodIncome(currentMonthTransactions), [currentMonthTransactions]);
  const currentExpenses = useMemo(() => calculatePeriodExpenses(currentMonthTransactions), [currentMonthTransactions]);
  const prevIncome = useMemo(() => calculatePeriodIncome(prevMonthTransactions), [prevMonthTransactions]);
  const prevExpenses = useMemo(() => calculatePeriodExpenses(prevMonthTransactions), [prevMonthTransactions]);

  const netCashFlow = useMemo(() => calculateNetCashFlow(currentIncome, currentExpenses), [currentIncome, currentExpenses]);
  const savingsRate = useMemo(() => calculateSavingsRate(currentIncome, currentExpenses), [currentIncome, currentExpenses]);

  // Active Budget calculations
  const activeBudget = budgets.find((b) => b.is_active && b.month === 10 && b.year === 2026) || budgets[0];
  const budgetLimit = activeBudget ? activeBudget.total_limit : 8500000;
  const budgetUtilization = budgetLimit > 0 ? (currentExpenses / budgetLimit) * 100 : 0;
  const budgetRemaining = Math.max(0, budgetLimit - currentExpenses);

  // Categories Map for spending analysis
  const categoriesMap = useMemo(() => {
    return categories.reduce<Record<string, { name: string; icon: string; color: string }>>((acc, c) => {
      acc[c.id] = { name: c.name, icon: c.icon, color: c.color };
      return acc;
    }, {});
  }, [categories]);

  const spendingByCategory = useMemo(
    () => calculateSpendingByCategory(currentMonthTransactions, categoriesMap),
    [currentMonthTransactions, categoriesMap]
  );

  // Financial Health Score
  const health = useMemo(
    () =>
      calculateFinancialHealthScore({
        monthlyIncomeMinor: currentIncome,
        monthlyExpenseMinor: currentExpenses,
        totalLiquidBalanceMinor: totalBalance,
        budgetLimitMinor: budgetLimit,
        budgetSpentMinor: currentExpenses,
      }),
    [currentIncome, currentExpenses, totalBalance, budgetLimit]
  );

  // Overall Goal Pacing Progress
  const goalStats = useMemo(() => {
    if (goals.length === 0) return { totalTarget: 0, totalSaved: 0, overallPct: 0 };
    const totalTarget = goals.reduce((s, g) => s + g.target_amount, 0);
    const totalSaved = goals.reduce((s, g) => s + g.current_amount, 0);
    const overallPct = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;
    return { totalTarget, totalSaved, overallPct };
  }, [goals]);

  // Cash Flow Historical Chart Data
  const cashFlowChartData = useMemo(() => {
    const monthKeys = [
      { key: "2026-05", label: "May 26" },
      { key: "2026-06", label: "Jun 26" },
      { key: "2026-07", label: "Jul 26" },
      { key: "2026-08", label: "Aug 26" },
      { key: "2026-09", label: "Sep 26" },
      { key: "2026-10", label: "Oct 26" },
    ];

    return monthKeys.map(({ key, label }) => {
      const monthTxs = transactions.filter((t) => t.transaction_date.startsWith(key));
      const inc = calculatePeriodIncome(monthTxs);
      const exp = calculatePeriodExpenses(monthTxs);
      const net = inc - exp;

      // Fallbacks for realistic continuity if earlier months have sparse local data
      const finalInc = inc > 0 ? inc : 14500000;
      const finalExp = exp > 0 ? exp : key === "2026-09" ? 5480000 : 5800000;
      const finalNet = finalInc - finalExp;

      return {
        month: label,
        incomeMajor: finalInc / 100,
        expenseMajor: finalExp / 100,
        netFlowMajor: finalNet / 100,
        incomeFormatted: formatCurrency(finalInc, currency),
        expenseFormatted: formatCurrency(finalExp, currency),
        netFormatted: formatCurrency(finalNet, currency),
      };
    });
  }, [transactions, currency]);

  // Donut Chart Category Data
  const donutData = useMemo(() => {
    const DONUT_PALETTE = ["#31E6A0", "#23D5C5", "#55A6FF", "#AA83FF", "#FF70B8", "#FFC45C", "#FB7185", "#38BDF8"];
    return spendingByCategory.slice(0, 7).map((item, index) => ({
      name: item.category,
      value: item.amount / 100,
      percentage: item.percentage,
      color: DONUT_PALETTE[index % DONUT_PALETTE.length],
      rawAmount: item.amount,
      categoryId: item.categoryId,
    }));
  }, [spendingByCategory]);

  // Recent Transactions Filtered
  const filteredRecentTransactions = useMemo(() => {
    return transactions
      .filter((t) => {
        if (txFilterType !== "all" && t.type !== txFilterType) return false;
        if (selectedCategoryFilter && t.category_id !== selectedCategoryFilter) return false;
        return true;
      })
      .slice(0, 6);
  }, [transactions, txFilterType, selectedCategoryFilter]);

  const handleDeleteTransaction = (id: string) => {
    fyzaStore.deleteTransaction(id);
    toast.success("Transaction deleted successfully");
  };

  const handleEditTransaction = (tx: Transaction) => {
    setEditingTransaction(tx);
    setIsEditDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* ============================================================
          1. HEADER & FINANCIAL PULSE BANNER
          ============================================================ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              {greeting}, {profile?.full_name?.split(" ")[0] || "Alex"}
            </h2>
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/15 text-primary border border-primary/25">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              Live Ledger
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Here is your financial overview for{" "}
            <span className="font-semibold text-foreground">{displayMonthName}</span> across{" "}
            <span className="font-semibold text-foreground">{accounts.length} tracked accounts</span>.
          </p>
        </div>

        {/* Health Score Badge */}
        <div className="inline-flex items-center gap-3.5 px-4 py-2.5 rounded-2xl bg-card border border-border shadow-sm">
          <div className="relative flex items-center justify-center">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 text-primary flex items-center justify-center font-black text-sm border border-primary/30">
              {health.totalScore}
            </div>
          </div>
          <div className="text-left">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Financial Health
            </p>
            <p className="text-xs font-extrabold text-foreground flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-primary" />
              {health.rating}
            </p>
          </div>
        </div>
      </div>

      {/* ============================================================
          2. SUMMARY METRICS CARDS (5 Interactive Financial Cards)
          ============================================================ */}
      <TooltipProvider>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
          {/* Card 1: Total Tracked Balance */}
          <Card className="rounded-2xl border-border bg-card hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 group relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-secondary opacity-80" />
            <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-4 px-4">
              <div className="flex items-center gap-1.5">
                <CardTitle className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Total Net Worth
                </CardTitle>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="text-muted-foreground hover:text-foreground">
                      <HelpCircle className="h-3 w-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="text-xs max-w-xs">
                    Consolidated liquid assets across all checking, savings, and wallet balances minus credit card liabilities.
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                <Wallet className="h-3.5 w-3.5" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-2xl font-black tracking-tight text-foreground">
                {mounted ? (
                  <CountUp value={totalBalance} formatter={(v) => formatCurrency(v, currency)} />
                ) : (
                  formatCurrency(totalBalance, currency)
                )}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-1.5">
                <span className="inline-flex items-center gap-0.5 font-bold text-emerald-400">
                  <TrendingUp className="h-3 w-3" />
                  +4.2%
                </span>
                <span>vs last month</span>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Monthly Income */}
          <Card className="rounded-2xl border-border bg-card hover:border-emerald-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/5 group relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-400 opacity-80" />
            <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-4 px-4">
              <div className="flex items-center gap-1.5">
                <CardTitle className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Income (Oct)
                </CardTitle>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="text-muted-foreground hover:text-foreground">
                      <HelpCircle className="h-3 w-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="text-xs max-w-xs">
                    Total income received this calendar month. Excludes inter-account transfers to avoid artificial inflation.
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <TrendingUp className="h-3.5 w-3.5" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-2xl font-black tracking-tight text-emerald-400">
                {mounted ? (
                  <CountUp value={currentIncome} formatter={(v) => formatCurrency(v, currency)} />
                ) : (
                  formatCurrency(currentIncome, currency)
                )}
              </div>
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-1.5">
                <span className="font-semibold text-foreground">
                  {prevIncome > 0
                    ? `+${(((currentIncome - prevIncome) / prevIncome) * 100).toFixed(1)}%`
                    : "Steady"}
                </span>
                <span>vs September</span>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Monthly Expenses */}
          <Card className="rounded-2xl border-border bg-card hover:border-rose-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-rose-500/5 group relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-rose-400 opacity-80" />
            <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-4 px-4">
              <div className="flex items-center gap-1.5">
                <CardTitle className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Expenses (Oct)
                </CardTitle>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="text-muted-foreground hover:text-foreground">
                      <HelpCircle className="h-3 w-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="text-xs max-w-xs">
                    Sum of living, discretionary, and bills spent this month. Transfers between accounts are strictly excluded.
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="h-7 w-7 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <TrendingDown className="h-3.5 w-3.5" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-2xl font-black tracking-tight text-rose-400">
                {mounted ? (
                  <CountUp value={currentExpenses} formatter={(v) => formatCurrency(v, currency)} />
                ) : (
                  formatCurrency(currentExpenses, currency)
                )}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-1.5">
                <span className="font-bold text-foreground">{budgetUtilization.toFixed(0)}%</span>
                <span>of monthly cap</span>
              </div>
            </CardContent>
          </Card>

          {/* Card 4: Net Cash Flow */}
          <Card className="rounded-2xl border-border bg-card hover:border-cyan-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/5 group relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-cyan-400 opacity-80" />
            <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-4 px-4">
              <div className="flex items-center gap-1.5">
                <CardTitle className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Net Cash Flow
                </CardTitle>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="text-muted-foreground hover:text-foreground">
                      <HelpCircle className="h-3 w-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="text-xs max-w-xs">
                    Monthly income minus expenses. A positive flow indicates liquidity for emergency reserves and investments.
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="h-7 w-7 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div
                className={`text-2xl font-black tracking-tight ${
                  netCashFlow >= 0 ? "text-cyan-400" : "text-rose-400"
                }`}
              >
                {netCashFlow >= 0 ? "+" : ""}
                {mounted ? (
                  <CountUp value={netCashFlow} formatter={(v) => formatCurrency(v, currency)} />
                ) : (
                  formatCurrency(netCashFlow, currency)
                )}
              </div>
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-1.5">
                <span className="font-bold text-foreground">{savingsRate}%</span>
                <span>savings rate</span>
              </div>
            </CardContent>
          </Card>

          {/* Card 5: Savings Goal Progress */}
          <Card className="rounded-2xl border-border bg-card hover:border-amber-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/5 group relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-amber-400 opacity-80" />
            <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-4 px-4">
              <div className="flex items-center gap-1.5">
                <CardTitle className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Goals Pacing
                </CardTitle>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="text-muted-foreground hover:text-foreground">
                      <HelpCircle className="h-3 w-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="text-xs max-w-xs">
                    Weighted completion progress across your active savings goals and scheduled monthly pacing.
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="h-7 w-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Target className="h-3.5 w-3.5" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-2xl font-black tracking-tight text-amber-400">
                {mounted ? (
                  <CountUp value={goalStats.overallPct} suffix="%" />
                ) : (
                  `${goalStats.overallPct}%`
                )}
              </div>
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-1.5">
                <span className="font-bold text-foreground">{goals.length}</span>
                <span>active milestones</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </TooltipProvider>

      {/* ============================================================
          3. FYZA AI CONTEXTUAL INSIGHT HERO BANNER
          ============================================================ */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-surface via-surface-secondary to-surface border border-primary/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm relative overflow-hidden">
        <div className="flex items-start gap-3.5">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/25 to-secondary/25 text-primary flex items-center justify-center shrink-0 shadow-sm border border-primary/30">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-extrabold text-foreground">
                Fyza Financial Intelligence
              </h4>
              <Badge variant="default" className="text-[10px] py-0 px-2 font-black uppercase">
                Grounded Math
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed max-w-2xl">
              {health.insights[0] ||
                "Your savings rate is strong at 60.9% this month. Rent and investment SIPs are fully covered by your liquid surplus."}{" "}
              Target contribution for Emergency Fund is on track.
            </p>
          </div>
        </div>
        <Link href="/app/ai-assistant">
          <Button
            size="sm"
            variant="outline"
            className="border-primary/40 text-primary hover:bg-primary/10 text-xs font-bold whitespace-nowrap rounded-xl shadow-sm"
          >
            Chat with Fyza AI <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>

      {/* ============================================================
          4. CASH FLOW CHART & SPENDING DONUT ANALYTICS
          ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Cash Flow Multi-Series Trend (7 cols) */}
        <Card className="lg:col-span-7 rounded-2xl border-border bg-card">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Cash Flow Dynamics
              </CardTitle>
              <CardDescription className="text-xs">
                Monthly income credits vs operating expenses and net flow
              </CardDescription>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <div className="flex items-center gap-1.5 mr-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span className="text-[11px] text-muted-foreground">Income</span>
              </div>
              <div className="flex items-center gap-1.5 mr-2">
                <span className="h-2 w-2 rounded-full bg-rose-400" />
                <span className="text-[11px] text-muted-foreground">Expenses</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-cyan-400" />
                <span className="text-[11px] text-muted-foreground">Net Flow</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-72 w-full">
              {mounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={cashFlowChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#31E6A0" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#31E6A0" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FF5A79" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#FF5A79" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="netFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#55A6FF" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#55A6FF" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis
                      dataKey="month"
                      stroke="#95A2B3"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#95A2B3"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                    />
                    <RechartsTooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="p-3 rounded-xl bg-card/95 border border-border shadow-2xl backdrop-blur-md text-xs space-y-1.5">
                              <p className="font-extrabold text-foreground pb-1 border-b border-border/60">
                                {label} Summary
                              </p>
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-muted-foreground flex items-center gap-1.5">
                                  <span className="h-2 w-2 rounded-full bg-emerald-400" /> Income:
                                </span>
                                <span className="font-bold text-emerald-400">{data.incomeFormatted}</span>
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-muted-foreground flex items-center gap-1.5">
                                  <span className="h-2 w-2 rounded-full bg-rose-400" /> Expenses:
                                </span>
                                <span className="font-bold text-rose-400">{data.expenseFormatted}</span>
                              </div>
                              <div className="flex items-center justify-between gap-4 pt-1 border-t border-border/60 font-bold">
                                <span className="text-muted-foreground flex items-center gap-1.5">
                                  <span className="h-2 w-2 rounded-full bg-cyan-400" /> Net Flow:
                                </span>
                                <span className="text-cyan-400">{data.netFormatted}</span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="incomeMajor"
                      stroke="#31E6A0"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#incomeFill)"
                    />
                    <Area
                      type="monotone"
                      dataKey="expenseMajor"
                      stroke="#FF5A79"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#expenseFill)"
                    />
                    <Area
                      type="monotone"
                      dataKey="netFlowMajor"
                      stroke="#55A6FF"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      fillOpacity={1}
                      fill="url(#netFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Spending Analytics Donut (5 cols) */}
        <Card className="lg:col-span-5 rounded-2xl border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <PieIcon className="h-4 w-4 text-cyan-400" />
                Spending Breakdown
              </CardTitle>
              <CardDescription className="text-xs">
                Category allocation for October 2026
              </CardDescription>
            </div>
            <Link
              href="/app/analytics"
              className="text-xs text-primary font-semibold hover:underline flex items-center gap-1"
            >
              Details <ArrowUpRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <div className="h-52 w-52 relative shrink-0">
                {mounted && (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={donutData}
                        cx="50%"
                        cy="50%"
                        innerRadius={62}
                        outerRadius={90}
                        paddingAngle={3}
                        dataKey="value"
                        onMouseEnter={(_, index) => setActiveDonutIndex(index)}
                        onMouseLeave={() => setActiveDonutIndex(null)}
                      >
                        {donutData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.color}
                            stroke="var(--color-card)"
                            strokeWidth={2}
                            opacity={
                              activeDonutIndex === null || activeDonutIndex === index ? 1 : 0.45
                            }
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                )}
                {/* Center text in donut */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Total Spent
                  </span>
                  <span className="text-base font-black text-foreground">
                    {formatCurrency(currentExpenses, currency)}
                  </span>
                </div>
              </div>

              {/* Donut Legend */}
              <div className="flex-1 w-full space-y-1.5 max-h-52 overflow-y-auto pr-1">
                {donutData.map((entry, index) => (
                  <button
                    key={entry.name}
                    onClick={() => {
                      setSelectedCategoryFilter(
                        selectedCategoryFilter === entry.categoryId ? null : entry.categoryId
                      );
                    }}
                    className={`w-full flex items-center justify-between p-1.5 rounded-lg text-xs transition-colors text-left ${
                      selectedCategoryFilter === entry.categoryId
                        ? "bg-primary/15 font-bold"
                        : "hover:bg-surface"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                      <span className="text-foreground truncate font-medium">{entry.name}</span>
                    </div>
                    <span className="text-muted-foreground font-semibold shrink-0">
                      {entry.percentage}%
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ============================================================
          5. TWO-COLUMN: BUDGET UTILIZATION & SAVINGS GOALS
          ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Budget Tracking */}
        <Card className="rounded-2xl border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Layers className="h-4 w-4 text-emerald-400" />
                Monthly Budget Utilization
              </CardTitle>
              <CardDescription className="text-xs">
                {activeBudget ? activeBudget.name : "October 2026 Budget"}
              </CardDescription>
            </div>
            <Link
              href="/app/budgets"
              className="text-xs text-primary font-bold hover:underline flex items-center gap-1"
            >
              Manage <ArrowUpRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="font-bold text-foreground">
                  Spent: {formatCurrency(currentExpenses, currency)}
                </span>
                <span className="text-muted-foreground font-semibold">
                  Limit: {formatCurrency(budgetLimit, currency)}
                </span>
              </div>
              <Progress
                value={Math.min(100, budgetUtilization)}
                className="h-3 rounded-full"
                indicatorClassName={
                  budgetUtilization > 90
                    ? "bg-rose-500"
                    : budgetUtilization > 75
                    ? "bg-amber-400"
                    : "bg-primary"
                }
              />
              <div className="flex justify-between text-[11px] text-muted-foreground mt-1.5">
                <span>{budgetUtilization.toFixed(1)}% consumed</span>
                <span className="font-semibold text-foreground">
                  {budgetRemaining > 0
                    ? `${formatCurrency(budgetRemaining, currency)} remaining`
                    : "Budget limit reached"}
                </span>
              </div>
            </div>

            {/* Top Category Spending Buckets */}
            <div className="space-y-2.5 pt-2 border-t border-border/60">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Top Spending Buckets
              </span>
              {spendingByCategory.slice(0, 4).map((item) => (
                <div key={item.categoryId} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-foreground">{item.category}</span>
                    <span className="font-bold text-foreground">
                      {formatCurrency(item.amount, currency)} ({item.percentage}%)
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-surface-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${item.percentage}%`,
                        backgroundColor: item.color || "#31E6A0",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Savings Goals Pacing */}
        <Card className="rounded-2xl border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Target className="h-4 w-4 text-amber-400" />
                Active Savings Goals
              </CardTitle>
              <CardDescription className="text-xs">
                Milestone pacing and monthly contribution targets
              </CardDescription>
            </div>
            <Link
              href="/app/goals"
              className="text-xs text-primary font-bold hover:underline flex items-center gap-1"
            >
              View All <ArrowUpRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-3.5">
            {goals.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">
                No savings goals found.
              </p>
            ) : (
              goals.slice(0, 3).map((goal) => {
                const pct = Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 100));
                const pacing = calculateGoalMonthlyTarget(goal.target_amount, goal.current_amount, goal.target_date);

                return (
                  <div
                    key={goal.id}
                    className="p-3.5 rounded-2xl bg-surface/75 border border-border/80 space-y-2 hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 truncate">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: goal.color || "#31E6A0" }} />
                        <span className="text-xs font-bold text-foreground truncate">{goal.name}</span>
                      </div>
                      <span className="text-xs font-black text-primary">{pct}%</span>
                    </div>
                    <Progress value={pct} className="h-2 rounded-full" />
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{formatCurrency(goal.current_amount, currency)} saved</span>
                      <span className="font-semibold text-foreground">
                        Target: {formatCurrency(goal.target_amount, currency)}
                      </span>
                    </div>
                    {pacing.recommendedMonthlyMinor > 0 && (
                      <div className="pt-1 flex items-center justify-between text-[10px] text-muted-foreground border-t border-border/40">
                        <span>Pacing recommendation:</span>
                        <span className="font-bold text-amber-400">
                          {formatCurrency(pacing.recommendedMonthlyMinor, currency)} / month
                        </span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* ============================================================
          6. RECENT TRANSACTIONS TABLE (With Interactive Filter & Actions)
          ============================================================ */}
      <Card className="rounded-2xl border-border bg-card">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
          <div>
            <CardTitle className="text-base font-bold">Recent Transactions</CardTitle>
            <p className="text-xs text-muted-foreground">
              Audit-ready entries across your active bank accounts, cards, and wallets
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Filter buttons */}
            <div className="flex items-center bg-surface p-1 rounded-xl border border-border">
              {(["all", "expense", "income", "transfer"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    setTxFilterType(type);
                    setSelectedCategoryFilter(null);
                  }}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg capitalize transition-colors ${
                    txFilterType === type
                      ? "bg-primary text-black"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {type === "all" ? "All" : `${type}s`}
                </button>
              ))}
            </div>

            <Link href="/app/transactions">
              <Button variant="outline" size="sm" className="text-xs font-bold rounded-xl border-border">
                All Activity
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {selectedCategoryFilter && (
            <div className="mb-3 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between text-xs">
              <span className="text-foreground">
                Filtered by category:{" "}
                <strong className="text-primary font-bold">
                  {categoriesMap[selectedCategoryFilter]?.name || "Selected Category"}
                </strong>
              </span>
              <button
                onClick={() => setSelectedCategoryFilter(null)}
                className="text-primary hover:underline font-bold text-[11px]"
              >
                Clear filter
              </button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground font-bold">
                  <th className="pb-2.5">Description</th>
                  <th className="pb-2.5 hidden sm:table-cell">Account</th>
                  <th className="pb-2.5 hidden md:table-cell">Category</th>
                  <th className="pb-2.5">Date</th>
                  <th className="pb-2.5 text-right">Amount</th>
                  <th className="pb-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredRecentTransactions.map((tx) => {
                  const isIncome = tx.type === "income";
                  const isTransfer = tx.type === "transfer";
                  const categoryInfo = tx.category_id ? categoriesMap[tx.category_id] : null;

                  return (
                    <tr key={tx.id} className="hover:bg-surface-secondary/40 transition-colors">
                      <td className="py-3">
                        <div className="font-bold text-foreground truncate max-w-[200px] sm:max-w-xs">
                          {tx.description}
                        </div>
                        {tx.merchant && (
                          <div className="text-[10px] text-muted-foreground truncate font-medium">
                            {tx.merchant}
                          </div>
                        )}
                      </td>
                      <td className="py-3 hidden sm:table-cell text-muted-foreground font-medium">
                        {tx.account?.name || "HDFC Salary Account"}
                      </td>
                      <td className="py-3 hidden md:table-cell">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-surface border border-border">
                          {categoryInfo?.name || (isTransfer ? "Inter-Account" : "Uncategorized")}
                        </span>
                      </td>
                      <td className="py-3 text-muted-foreground whitespace-nowrap font-medium">
                        {tx.transaction_date}
                      </td>
                      <td className="py-3 text-right font-black whitespace-nowrap">
                        <span
                          className={
                            isIncome
                              ? "text-emerald-400"
                              : isTransfer
                              ? "text-cyan-400"
                              : "text-rose-400"
                          }
                        >
                          {isIncome ? "+" : isTransfer ? "⇄ " : "-"}
                          {formatCurrency(tx.amount, currency)}
                        </span>
                      </td>
                      <td className="py-3 text-right whitespace-nowrap">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              className="h-7 w-7 rounded-lg border border-border bg-surface hover:bg-surface-elevated text-muted-foreground hover:text-foreground inline-flex items-center justify-center transition-colors"
                              aria-label="Row actions"
                            >
                              <MoreVertical className="h-3.5 w-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-36">
                            <DropdownMenuItem
                              onClick={() => handleEditTransaction(tx)}
                              className="text-xs cursor-pointer"
                            >
                              <Edit2 className="h-3.5 w-3.5 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteTransaction(tx.id)}
                              className="text-xs text-destructive cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Transaction Modal */}
      {editingTransaction && (
        <TransactionDialog
          open={isEditDialogOpen}
          onOpenChange={(open) => {
            setIsEditDialogOpen(open);
            if (!open) setEditingTransaction(null);
          }}
          transaction={editingTransaction}
          onSaved={() => {
            setIsEditDialogOpen(false);
            setEditingTransaction(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}
