"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Shield,
  PieChart,
  Target,
  Bot,
  Sparkles,
  BarChart3,
  Calendar,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  RotateCcw,
  Search,
  Trash2,
  Edit2,
  Plus,
  CalendarClock,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/components/providers/auth-provider";
import { ThemeSelector } from "@/components/layout/theme-selector";
import { fyzaStore } from "@/lib/store";
import {
  calculateTotalBalance,
  filterTransactionsByDateRange,
  calculatePeriodIncome,
  calculatePeriodExpenses,
  calculateNetCashFlow,
  calculateSavingsRate,
  calculateSpendingByCategory,
  calculateBudgetCategoryUtilization,
  calculateGoalMonthlyTarget,
} from "@/lib/calculations";
import { formatCurrency, toMinorUnits, toMajorUnits } from "@/lib/utils";
import type { Transaction, Account, Category, Budget, Goal, TransactionType } from "@/lib/types";
import { toast } from "sonner";

export default function InteractiveDemoPage() {
  const router = useRouter();
  const { startDemoSession } = useAuth();

  // Active Playground Tab
  const [activeTab, setActiveTab] = useState<"dashboard" | "transactions" | "budgets" | "goals" | "ai">("dashboard");

  // Store State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);

  // Period Selector State
  const [period, setPeriod] = useState<"this_month" | "last_month" | "last_3_months" | "all_time">("this_month");

  // Transaction Filters State
  const [txSearch, setTxSearch] = useState("");
  const [txTypeFilter, setTxTypeFilter] = useState<string>("all");
  const [txCatFilter, setTxCatFilter] = useState<string>("all");
  const [txSortBy, setTxSortBy] = useState<"date_desc" | "date_asc" | "amount_desc" | "amount_asc">("date_desc");

  // Transaction Modal States
  const [isTxDialogOpen, setIsTxDialogOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [deletingTx, setDeletingTx] = useState<Transaction | null>(null);
  const [txFormData, setTxFormData] = useState({
    description: "",
    merchant: "",
    amount: "",
    type: "expense" as TransactionType,
    category_id: "",
    account_id: "",
    transaction_date: "2026-10-15",
  });

  // Goal Contribution Modal State
  const [contributingGoal, setContributingGoal] = useState<Goal | null>(null);
  const [contributionAmount, setContributionAmount] = useState("5000");

  // AI Q&A State
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiAnswer, setAiAnswer] = useState<{
    text: string;
    chips?: Array<{ label: string; value: string; color?: string }>;
    timestamp: string;
  } | null>(null);
  const [isAiThinking, setIsAiThinking] = useState(false);

  // Load Data from Reactive Store
  const loadStoreData = () => {
    setTransactions(fyzaStore.getTransactions());
    setAccounts(fyzaStore.getAccounts());
    setCategories(fyzaStore.getCategories());
    setBudgets(fyzaStore.getBudgets());
    setGoals(fyzaStore.getGoals());
  };

  useEffect(() => {
    fyzaStore.init();
    loadStoreData();
    window.addEventListener("fyza_store_updated", loadStoreData);
    return () => window.removeEventListener("fyza_store_updated", loadStoreData);
  }, []);

  // Reset Demo Changes
  const handleResetDemo = () => {
    fyzaStore.resetToDemo();
    loadStoreData();
    toast.success("Demo ledger restored to initial state.");
  };

  // Launch Full Dashboard Cockpit
  const handleOpenFullDashboard = () => {
    startDemoSession();
    router.push("/app");
  };

  // Period Date Ranges
  const dateRange = useMemo(() => {
    switch (period) {
      case "last_month":
        return { start: "2026-09-01", end: "2026-09-30", label: "September 2026" };
      case "last_3_months":
        return { start: "2026-08-01", end: "2026-10-31", label: "Aug – Oct 2026" };
      case "all_time":
        return { start: "2020-01-01", end: "2099-12-31", label: "All Time Ledger" };
      case "this_month":
      default:
        return { start: "2026-10-01", end: "2026-10-31", label: "October 2026 (Current)" };
    }
  }, [period]);

  // Derived Financial Metrics
  const filteredTxs = useMemo(() => {
    return filterTransactionsByDateRange(transactions, dateRange.start, dateRange.end);
  }, [transactions, dateRange]);

  const totalBalance = useMemo(() => {
    return calculateTotalBalance(accounts);
  }, [accounts]);

  const periodIncome = useMemo(() => {
    return calculatePeriodIncome(filteredTxs);
  }, [filteredTxs]);

  const periodExpenses = useMemo(() => {
    return calculatePeriodExpenses(filteredTxs);
  }, [filteredTxs]);

  const netCashFlow = useMemo(() => {
    return calculateNetCashFlow(periodIncome, periodExpenses);
  }, [periodIncome, periodExpenses]);

  const savingsRate = useMemo(() => {
    return calculateSavingsRate(periodIncome, periodExpenses);
  }, [periodIncome, periodExpenses]);

  // Categories Map
  const categoriesMap = useMemo(() => {
    const map: Record<string, { name: string; icon: string; color: string }> = {};
    categories.forEach((c) => {
      map[c.id] = { name: c.name, icon: c.icon, color: c.color };
    });
    return map;
  }, [categories]);

  // Category Spending Breakdown
  const spendingByCategory = useMemo(() => {
    return calculateSpendingByCategory(filteredTxs, categoriesMap);
  }, [filteredTxs, categoriesMap]);

  // Primary Active Budget
  const activeBudget = useMemo(() => {
    return budgets.find((b) => b.is_active) || budgets[0] || null;
  }, [budgets]);

  // Budget Utilization Overall
  const budgetUtilization = useMemo(() => {
    if (!activeBudget || activeBudget.total_limit <= 0) return 0;
    const rate = (periodExpenses / activeBudget.total_limit) * 100;
    return Math.min(100, Math.round(rate * 10) / 10);
  }, [activeBudget, periodExpenses]);

  // Savings Goal Overall Progress
  const totalGoalProgress = useMemo(() => {
    if (goals.length === 0) return 0;
    const totalTarget = goals.reduce((sum, g) => sum + g.target_amount, 0);
    const totalCurrent = goals.reduce((sum, g) => sum + g.current_amount, 0);
    if (totalTarget <= 0) return 0;
    return Math.min(100, Math.round((totalCurrent / totalTarget) * 1000) / 10);
  }, [goals]);

  // Filtered & Sorted Transactions for the Playground Table
  const tableTransactions = useMemo(() => {
    return transactions
      .filter((t) => {
        // Search
        if (txSearch) {
          const q = txSearch.toLowerCase();
          const matchDesc = t.description.toLowerCase().includes(q);
          const matchMerchant = t.merchant?.toLowerCase().includes(q);
          if (!matchDesc && !matchMerchant) return false;
        }
        // Type
        if (txTypeFilter !== "all" && t.type !== txTypeFilter) return false;
        // Category
        if (txCatFilter !== "all" && t.category_id !== txCatFilter) return false;

        return true;
      })
      .sort((a, b) => {
        if (txSortBy === "date_desc") return b.transaction_date.localeCompare(a.transaction_date);
        if (txSortBy === "date_asc") return a.transaction_date.localeCompare(b.transaction_date);
        if (txSortBy === "amount_desc") return b.amount - a.amount;
        if (txSortBy === "amount_asc") return a.amount - b.amount;
        return 0;
      });
  }, [transactions, txSearch, txTypeFilter, txCatFilter, txSortBy]);

  // Open Add Transaction Dialog
  const handleOpenAddTx = (type: TransactionType = "expense") => {
    setEditingTx(null);
    setTxFormData({
      description: "",
      merchant: "",
      amount: "",
      type,
      category_id: categories.find((c) => c.type === type)?.id || categories[0]?.id || "",
      account_id: accounts[0]?.id || "acc-1",
      transaction_date: "2026-10-15",
    });
    setIsTxDialogOpen(true);
  };

  // Open Edit Transaction Dialog
  const handleOpenEditTx = (tx: Transaction) => {
    setEditingTx(tx);
    setTxFormData({
      description: tx.description,
      merchant: tx.merchant || "",
      amount: String(toMajorUnits(tx.amount)),
      type: tx.type,
      category_id: tx.category_id || "",
      account_id: tx.account_id,
      transaction_date: tx.transaction_date,
    });
    setIsTxDialogOpen(true);
  };

  // Save Transaction (Add or Edit)
  const handleSaveTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(txFormData.amount);
    if (isNaN(amountVal) || amountVal <= 0) {
      toast.error("Please enter a valid amount greater than 0");
      return;
    }
    if (!txFormData.description.trim()) {
      toast.error("Please enter a description");
      return;
    }

    const minorAmount = toMinorUnits(amountVal);

    if (editingTx) {
      fyzaStore.saveTransaction({
        ...editingTx,
        description: txFormData.description.trim(),
        merchant: txFormData.merchant.trim() || null,
        amount: minorAmount,
        type: txFormData.type,
        category_id: txFormData.category_id || null,
        account_id: txFormData.account_id,
        transaction_date: txFormData.transaction_date,
      });
      toast.success("Demo transaction updated!");
    } else {
      fyzaStore.saveTransaction({
        account_id: txFormData.account_id || accounts[0]?.id || "acc-1",
        type: txFormData.type,
        amount: minorAmount,
        currency: "INR",
        category_id: txFormData.category_id || null,
        description: txFormData.description.trim(),
        merchant: txFormData.merchant.trim() || null,
        transaction_date: txFormData.transaction_date,
        notes: null,
        tags: ["demo"],
        is_recurring: false,
        recurring_id: null,
        transfer_account_id: null,
      });
      toast.success(`Demo ${txFormData.type} recorded!`);
    }

    setIsTxDialogOpen(false);
  };

  // Delete Transaction
  const handleDeleteTransaction = () => {
    if (!deletingTx) return;
    fyzaStore.deleteTransaction(deletingTx.id);
    toast.success("Demo transaction deleted.");
    setDeletingTx(null);
  };

  // Quick Add Expense on a Specific Budget Category
  const handleQuickCategorySpend = (category: Category, amountRupees: number) => {
    const minorAmount = toMinorUnits(amountRupees);
    fyzaStore.saveTransaction({
      account_id: accounts[0]?.id || "acc-1",
      type: "expense",
      amount: minorAmount,
      currency: "INR",
      category_id: category.id,
      description: `Sample ${category.name} Spend`,
      merchant: `Demo Merchant`,
      transaction_date: "2026-10-15",
      notes: "Interactive demo simulation",
      tags: ["demo"],
      is_recurring: false,
      recurring_id: null,
      transfer_account_id: null,
    });

    toast.success(`Simulated ₹${amountRupees} spend in ${category.name}!`);
  };

  // Edit Budget Category Limit
  const handleUpdateCategoryLimit = (categoryId: string, newLimitMajor: number) => {
    if (!activeBudget) return;
    const minor = toMinorUnits(newLimitMajor);
    fyzaStore.updateBudgetCategoryLimit(activeBudget.id, categoryId, minor);
  };

  // Record Goal Contribution
  const handleRecordContribution = (amountMajor: number) => {
    if (!contributingGoal) return;
    const minor = toMinorUnits(amountMajor);
    fyzaStore.contributeToGoal(contributingGoal.id, minor, "Demo contribution");
    toast.success(`Recorded ₹${amountMajor.toLocaleString()} contribution to ${contributingGoal.name}!`);
    setContributingGoal(null);
  };

  // Adjust Goal Target
  const handleUpdateGoalTarget = (goal: Goal, newTargetMajor: number) => {
    const minor = toMinorUnits(newTargetMajor);
    fyzaStore.saveGoal({
      ...goal,
      target_amount: minor,
    });
  };

  // Adjust Goal Target Date
  const handleUpdateGoalDate = (goal: Goal, newDate: string) => {
    fyzaStore.saveGoal({
      ...goal,
      target_date: newDate,
    });
  };

  // Grounded Deterministic AI Q&A Engine
  const runAiQuery = (query: string) => {
    setIsAiThinking(true);
    setAiQuestion(query);

    setTimeout(() => {
      const q = query.toLowerCase();
      let responseText = "";
      let chips: Array<{ label: string; value: string; color?: string }> = [];

      // 1. Food / Dining
      if (q.includes("food") || q.includes("dining") || q.includes("restaurant") || q.includes("eating")) {
        const foodCat = categories.find((c) => c.name.toLowerCase().includes("food") || c.name.toLowerCase().includes("dining"));
        const foodTxs = filteredTxs.filter((t) => t.category_id === foodCat?.id && t.type === "expense");
        const totalFood = calculatePeriodExpenses(foodTxs);
        const diningBudgetCat = activeBudget?.categories?.find((c) => c.category_id === foodCat?.id);
        const limit = diningBudgetCat?.limit_amount || 1500000;
        const pct = Math.round((totalFood / limit) * 100);

        responseText = `In ${dateRange.label}, you spent ${formatCurrency(totalFood)} across ${foodTxs.length} dining transactions. This represents ${pct}% of your ${formatCurrency(limit)} dining allocation. You have ${formatCurrency(Math.max(0, limit - totalFood))} remaining in this category.`;
        chips = [
          { label: "Food Spend", value: formatCurrency(totalFood), color: "text-amber-400" },
          { label: "Category Limit", value: formatCurrency(limit), color: "text-foreground" },
          { label: "Remaining", value: formatCurrency(Math.max(0, limit - totalFood)), color: "text-emerald-400" },
        ];
      }
      // 2. Where did money go / Top spending
      else if (q.includes("where") || q.includes("most") || q.includes("top") || q.includes("breakdown")) {
        if (spendingByCategory.length > 0) {
          const top3 = spendingByCategory.slice(0, 3);
          const topNames = top3.map((c) => `${c.category} (${formatCurrency(c.amount)}, ${c.percentage}%)`).join(", ");
          responseText = `During ${dateRange.label}, total expenses were ${formatCurrency(periodExpenses)}. Your highest outflows went to: ${topNames}. Your largest single expense category is ${top3[0]?.category}.`;
          chips = top3.map((c) => ({
            label: c.category,
            value: formatCurrency(c.amount),
            color: "text-cyan-400",
          }));
        } else {
          responseText = `No expense transactions were recorded during ${dateRange.label}.`;
        }
      }
      // 3. Budget remaining / limits
      else if (q.includes("budget") || q.includes("remains") || q.includes("limit")) {
        const totalBudget = activeBudget?.total_limit || 8500000;
        const remaining = Math.max(0, totalBudget - periodExpenses);
        const pct = Math.round((periodExpenses / totalBudget) * 100);

        responseText = `Your total monthly budget ceiling is ${formatCurrency(totalBudget)}. With ${formatCurrency(periodExpenses)} spent so far in ${dateRange.label}, you have ${formatCurrency(remaining)} remaining (${100 - pct}% unspent). You are pacing well within your safety threshold.`;
        chips = [
          { label: "Budget Ceiling", value: formatCurrency(totalBudget), color: "text-foreground" },
          { label: "Total Spent", value: formatCurrency(periodExpenses), color: "text-rose-400" },
          { label: "Safe to Spend", value: formatCurrency(remaining), color: "text-emerald-400" },
        ];
      }
      // 4. Savings Goal / Pacing
      else if (q.includes("savings") || q.includes("goal") || q.includes("reach") || q.includes("emergency")) {
        const activeGoals = goals.filter((g) => g.status === "active");
        if (activeGoals.length > 0) {
          const primaryGoal = activeGoals[0];
          const plan = calculateGoalMonthlyTarget(primaryGoal.target_amount, primaryGoal.current_amount, primaryGoal.target_date);
          const pct = Math.round((primaryGoal.current_amount / primaryGoal.target_amount) * 100);

          responseText = `Your top priority goal is "${primaryGoal.name}", currently at ${pct}% (${formatCurrency(primaryGoal.current_amount)} of ${formatCurrency(primaryGoal.target_amount)}). To complete it on schedule by ${primaryGoal.target_date || "target date"}, your recommended contribution is ${formatCurrency(plan.recommendedMonthlyMinor)}/month across the remaining ${plan.monthsRemaining} months.`;
          chips = [
            { label: "Current Saved", value: formatCurrency(primaryGoal.current_amount), color: "text-primary" },
            { label: "Remaining", value: formatCurrency(plan.remainingMinor), color: "text-amber-400" },
            { label: "Monthly Target", value: `${formatCurrency(plan.recommendedMonthlyMinor)}/mo`, color: "text-cyan-400" },
          ];
        } else {
          responseText = "You currently have no active savings goals configured.";
        }
      }
      // Default Fallback
      else {
        responseText = `Grounded analysis over your ${dateRange.label} ledger: Total income is ${formatCurrency(periodIncome)}, expenses are ${formatCurrency(periodExpenses)}, giving a net savings surplus of ${formatCurrency(netCashFlow)} (${savingsRate}% savings rate). All numbers are calculated deterministically in integer minor units.`;
        chips = [
          { label: "Net Surplus", value: formatCurrency(netCashFlow), color: "text-emerald-400" },
          { label: "Savings Rate", value: `${savingsRate}%`, color: "text-primary" },
          { label: "Tracked Balance", value: formatCurrency(totalBalance), color: "text-cyan-400" },
        ];
      }

      setAiAnswer({
        text: responseText,
        chips,
        timestamp: "Calculated just now from isolated demo store",
      });
      setIsAiThinking(false);
    }, 450);
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-black pb-20">
      {/* 1. PERSISTENT DEMO MODE BANNER */}
      <div className="sticky top-0 z-50 bg-amber-500/15 border-b border-amber-500/30 backdrop-blur-xl px-4 py-2.5 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-amber-300 font-semibold text-center sm:text-left">
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
            <span>
              DEMO MODE — Sample Data Only • No real money or bank accounts are accessed or stored.
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetDemo}
              className="h-7 text-[11px] font-bold border-amber-500/40 text-amber-300 hover:bg-amber-500/20"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset Demo Data
            </Button>

            <Link href="/signup">
              <Button
                size="sm"
                className="h-7 text-[11px] font-bold bg-primary text-black hover:bg-primary/90"
              >
                Create Real Account
              </Button>
            </Link>

            <Link href="/">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-[11px] font-medium text-muted-foreground hover:text-foreground"
              >
                Return to Home
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header className="border-b border-border/80 bg-surface/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">
                <span className="font-extrabold text-black text-xl">F</span>
              </div>
              <div>
                <span className="font-extrabold text-xl tracking-tight text-foreground flex items-center gap-2">
                  Fyza
                  <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                    Interactive Playground
                  </Badge>
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <ThemeSelector />

            <Button
              onClick={handleOpenFullDashboard}
              className="bg-primary text-black font-semibold text-xs hover:bg-primary/90 shadow-sm shadow-primary/20"
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              Open Full Dashboard App
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Intro */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border/70">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
              Interactive Financial Demo
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-2xl">
              Add transactions, adjust budget thresholds, record savings goal contributions, and converse with Fyza AI. All metrics calculate in real time using integer-accurate minor units.
            </p>
          </div>

          {/* Period Selector */}
          <div className="flex items-center gap-2 bg-surface p-1.5 rounded-xl border border-border">
            <Calendar className="h-4 w-4 text-primary ml-1 shrink-0" />
            <Select value={period} onValueChange={(v) => setPeriod(v as "this_month" | "last_month" | "last_3_months" | "all_time")}>
              <SelectTrigger className="w-48 h-8 text-xs bg-background border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="this_month">This Month (Oct 2026)</SelectItem>
                <SelectItem value="last_month">Last Month (Sep 2026)</SelectItem>
                <SelectItem value="last_3_months">Last 3 Months (Aug - Oct)</SelectItem>
                <SelectItem value="all_time">All Time (Full Ledger)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center overflow-x-auto gap-2 py-4 no-scrollbar">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === "dashboard"
                ? "bg-primary text-black shadow-md shadow-primary/20"
                : "bg-surface border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            <span>1. Dashboard & Cash Flow</span>
          </button>

          <button
            onClick={() => setActiveTab("transactions")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === "transactions"
                ? "bg-primary text-black shadow-md shadow-primary/20"
                : "bg-surface border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <Activity className="h-4 w-4" />
            <span>2. Transaction Playground</span>
          </button>

          <button
            onClick={() => setActiveTab("budgets")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === "budgets"
                ? "bg-primary text-black shadow-md shadow-primary/20"
                : "bg-surface border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <PieChart className="h-4 w-4" />
            <span>3. Budget Playground</span>
          </button>

          <button
            onClick={() => setActiveTab("goals")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === "goals"
                ? "bg-primary text-black shadow-md shadow-primary/20"
                : "bg-surface border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <Target className="h-4 w-4" />
            <span>4. Savings Goal Playground</span>
          </button>

          <button
            onClick={() => setActiveTab("ai")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === "ai"
                ? "bg-secondary text-white shadow-md shadow-secondary/20"
                : "bg-surface border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <Bot className="h-4 w-4" />
            <span>5. Fyza AI Assistant Preview</span>
          </button>
        </div>
      </div>

      {/* Main Playgrounds Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
        {/* ======================================================== */}
        {/* PLAYGROUND 1: INTERACTIVE DASHBOARD & CASH FLOW */}
        {/* ======================================================== */}
        {activeTab === "dashboard" && (
          <div className="space-y-6 animate-fade-in">
            {/* 7 Key Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              <Card className="p-3.5 border-border bg-card/70">
                <p className="text-[10px] font-semibold uppercase text-muted-foreground">Total Balance</p>
                <p className="text-base sm:text-lg font-extrabold text-foreground mt-0.5 truncate">
                  {formatCurrency(totalBalance)}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">4 Accounts</p>
              </Card>

              <Card className="p-3.5 border-border bg-card/70">
                <p className="text-[10px] font-semibold uppercase text-muted-foreground">Period Income</p>
                <p className="text-base sm:text-lg font-extrabold text-emerald-400 mt-0.5 truncate">
                  {formatCurrency(periodIncome)}
                </p>
                <p className="text-[10px] text-emerald-400 mt-0.5">Inflow</p>
              </Card>

              <Card className="p-3.5 border-border bg-card/70">
                <p className="text-[10px] font-semibold uppercase text-muted-foreground">Period Expenses</p>
                <p className="text-base sm:text-lg font-extrabold text-rose-400 mt-0.5 truncate">
                  {formatCurrency(periodExpenses)}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Outflow</p>
              </Card>

              <Card className="p-3.5 border-border bg-card/70">
                <p className="text-[10px] font-semibold uppercase text-muted-foreground">Net Cash Flow</p>
                <p className={`text-base sm:text-lg font-extrabold mt-0.5 truncate ${netCashFlow >= 0 ? "text-primary" : "text-rose-400"}`}>
                  {netCashFlow >= 0 ? `+${formatCurrency(netCashFlow)}` : formatCurrency(netCashFlow)}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Net Velocity</p>
              </Card>

              <Card className="p-3.5 border-border bg-card/70">
                <p className="text-[10px] font-semibold uppercase text-muted-foreground">Savings Rate</p>
                <p className="text-base sm:text-lg font-extrabold text-cyan-400 mt-0.5">
                  {savingsRate}%
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Of Total Income</p>
              </Card>

              <Card className="p-3.5 border-border bg-card/70">
                <p className="text-[10px] font-semibold uppercase text-muted-foreground">Budget Used</p>
                <p className={`text-base sm:text-lg font-extrabold mt-0.5 ${budgetUtilization > 90 ? "text-rose-400" : "text-amber-400"}`}>
                  {budgetUtilization}%
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Monthly Limit</p>
              </Card>

              <Card className="p-3.5 border-border bg-card/70 col-span-2 md:col-span-1">
                <p className="text-[10px] font-semibold uppercase text-muted-foreground">Goal Progress</p>
                <p className="text-base sm:text-lg font-extrabold text-primary mt-0.5">
                  {totalGoalProgress}%
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">3 Active Goals</p>
              </Card>
            </div>

            {/* Inflow vs Outflow Visual Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8 p-5 rounded-2xl border border-border bg-card/60 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Cash Flow Daily Inflow vs Outflow</h3>
                    <p className="text-xs text-muted-foreground">{dateRange.label}</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 inline-block" /> Inflow
                    </span>
                    <span className="flex items-center gap-1.5 text-rose-400 font-semibold">
                      <span className="h-2 w-2 rounded-full bg-rose-400 inline-block" /> Outflow
                    </span>
                  </div>
                </div>

                <div className="h-44 flex items-end gap-2 pt-6">
                  {[
                    { day: "01", inc: 85, exp: 25 },
                    { day: "05", inc: 35, exp: 40 },
                    { day: "09", inc: 50, exp: 20 },
                    { day: "12", inc: 90, exp: 35 },
                    { day: "16", inc: 40, exp: 25 },
                    { day: "19", inc: 70, exp: 50 },
                    { day: "22", inc: 45, exp: 20 },
                    { day: "26", inc: 95, exp: 30 },
                    { day: "30", inc: 75, exp: 40 },
                  ].map((d, idx) => (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group cursor-pointer">
                      <div className="w-full flex items-end gap-1 h-32">
                        <div
                          className="flex-1 rounded-t bg-gradient-to-t from-emerald-500/40 to-emerald-400 group-hover:brightness-125 transition-all"
                          style={{ height: `${d.inc}%` }}
                          title={`Day ${d.day} Inflow: High`}
                        />
                        <div
                          className="flex-1 rounded-t bg-gradient-to-t from-rose-500/40 to-rose-400 group-hover:brightness-125 transition-all"
                          style={{ height: `${d.exp}%` }}
                          title={`Day ${d.day} Outflow: Normal`}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono">{d.day}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Category Spending Breakdown */}
              <div className="lg:col-span-4 p-5 rounded-2xl border border-border bg-card/60 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-foreground">Top Outflows by Category</h3>
                  <span className="text-xs text-muted-foreground font-mono">{spendingByCategory.length} categories</span>
                </div>

                <div className="space-y-3">
                  {spendingByCategory.slice(0, 5).map((item) => (
                    <div key={item.categoryId} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full inline-block" style={{ backgroundColor: item.color }} />
                          {item.category}
                        </span>
                        <span className="font-mono text-muted-foreground">
                          {formatCurrency(item.amount)} ({item.percentage}%)
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* PLAYGROUND 2: TRANSACTION PLAYGROUND */}
        {/* ======================================================== */}
        {activeTab === "transactions" && (
          <div className="space-y-6 animate-fade-in">
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl border border-border bg-card/60">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  onClick={() => handleOpenAddTx("income")}
                  className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-xs h-9"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Income
                </Button>
                <Button
                  onClick={() => handleOpenAddTx("expense")}
                  className="bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs h-9"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Expense
                </Button>
                <span className="text-xs text-muted-foreground hidden lg:inline ml-2">
                  Changes update dashboard totals, category charts, and budget utilization immediately.
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Search */}
                <div className="relative w-full sm:w-48">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search ledger..."
                    value={txSearch}
                    onChange={(e) => setTxSearch(e.target.value)}
                    className="pl-8 h-9 text-xs bg-surface border-border"
                  />
                </div>

                {/* Type Filter */}
                <Select value={txTypeFilter} onValueChange={setTxTypeFilter}>
                  <SelectTrigger className="w-28 h-9 text-xs bg-surface border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                  </SelectContent>
                </Select>

                {/* Category Filter */}
                <Select value={txCatFilter} onValueChange={setTxCatFilter}>
                  <SelectTrigger className="w-36 h-9 text-xs bg-surface border-border">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Sort By */}
                <Select value={txSortBy} onValueChange={(v) => setTxSortBy(v as "date_desc" | "date_asc" | "amount_desc" | "amount_asc")}>
                  <SelectTrigger className="w-36 h-9 text-xs bg-surface border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date_desc">Newest First</SelectItem>
                    <SelectItem value="date_asc">Oldest First</SelectItem>
                    <SelectItem value="amount_desc">Highest Amount</SelectItem>
                    <SelectItem value="amount_asc">Lowest Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Isolation Guarantee Alert */}
            <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/10 flex items-center justify-between text-xs text-primary">
              <span className="flex items-center gap-2">
                <Shield className="h-4 w-4 shrink-0" />
                <span>
                  Transfers are strictly isolated and never artificially inflate income or expense totals.
                </span>
              </span>
              <span className="font-mono text-[11px] text-muted-foreground">
                Showing {tableTransactions.length} demo records
              </span>
            </div>

            {/* Transaction Ledger Table */}
            <Card className="border-border bg-card p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface/60 border-b border-border text-muted-foreground font-semibold uppercase">
                    <tr>
                      <th className="px-5 py-3.5">Description & Merchant</th>
                      <th className="px-5 py-3.5">Category</th>
                      <th className="px-5 py-3.5">Account</th>
                      <th className="px-5 py-3.5">Date</th>
                      <th className="px-5 py-3.5 text-right">Amount</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {tableTransactions.map((tx) => {
                      const category = categories.find((c) => c.id === tx.category_id);
                      const account = accounts.find((a) => a.id === tx.account_id);
                      const isInc = tx.type === "income";
                      const isTrans = tx.type === "transfer";

                      return (
                        <tr key={tx.id} className="hover:bg-surface/30 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className={`h-7 w-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                                isInc
                                  ? "bg-emerald-500/15 text-emerald-400"
                                  : isTrans
                                  ? "bg-cyan-500/15 text-cyan-400"
                                  : "bg-surface border border-border text-foreground"
                              }`}>
                                {isInc ? <ArrowUpRight className="h-3.5 w-3.5" /> : isTrans ? <Activity className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                              </div>
                              <div>
                                <p className="font-bold text-foreground text-xs leading-tight">{tx.description}</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">{tx.merchant || account?.name || "Auto"}</p>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-3.5">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-surface border border-border text-foreground">
                              {category?.name || "Uncategorized"}
                            </span>
                          </td>

                          <td className="px-5 py-3.5 text-muted-foreground">
                            {account?.name || "Checking"}
                          </td>

                          <td className="px-5 py-3.5 font-mono text-muted-foreground">
                            {tx.transaction_date}
                          </td>

                          <td className="px-5 py-3.5 text-right font-mono font-extrabold text-sm">
                            <span className={isInc ? "text-emerald-400" : isTrans ? "text-cyan-400" : "text-foreground"}>
                              {isInc ? `+${formatCurrency(tx.amount)}` : isTrans ? formatCurrency(tx.amount) : `-${formatCurrency(tx.amount)}`}
                            </span>
                          </td>

                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenEditTx(tx)}
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                title="Edit transaction"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeletingTx(tx)}
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-400"
                                title="Delete transaction"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* ======================================================== */}
        {/* PLAYGROUND 3: BUDGET PLAYGROUND */}
        {/* ======================================================== */}
        {activeTab === "budgets" && (
          <div className="space-y-6 animate-fade-in">
            <div className="p-4 rounded-2xl border border-border bg-card/60">
              <h3 className="text-sm font-bold text-foreground">Zero-Based Smart Budgets Simulation</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Adjust category limit sliders or click &ldquo;+ Spend&rdquo; to watch progress indicators animate and trigger threshold warnings in real time.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeBudget?.categories?.map((bc) => {
                const cat = categories.find((c) => c.id === bc.category_id);
                if (!cat) return null;

                const catTxs = filteredTxs.filter((t) => t.category_id === cat.id && t.type === "expense");
                const spent = calculatePeriodExpenses(catTxs);
                const util = calculateBudgetCategoryUtilization(bc.limit_amount, spent);

                return (
                  <Card key={bc.id} className="p-5 border-border bg-card/70 space-y-4 relative overflow-hidden">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="h-8 w-8 rounded-lg flex items-center justify-center font-bold text-xs"
                          style={{ backgroundColor: `${cat.color}25`, color: cat.color }}
                        >
                          {cat.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-foreground">{cat.name}</p>
                          <p className="text-[10px] text-muted-foreground">{catTxs.length} expense transactions</p>
                        </div>
                      </div>

                      <Badge
                        variant="outline"
                        className={`text-[10px] font-bold ${
                          util.isOverBudget
                            ? "bg-rose-500/15 text-rose-400 border-rose-500/30"
                            : util.percentage >= 75
                            ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                            : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                        }`}
                      >
                        {util.isOverBudget ? "Exceeded!" : util.percentage >= 75 ? "Warning (75%+)" : "Safe"}
                      </Badge>
                    </div>

                    {/* Spent vs Limit Progress */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono font-bold text-foreground">{formatCurrency(spent)}</span>
                        <span className="font-mono text-muted-foreground">{formatCurrency(bc.limit_amount)} ({util.percentage}%)</span>
                      </div>

                      <div className="h-2 w-full rounded-full bg-border overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            util.isOverBudget ? "bg-rose-500" : util.percentage >= 75 ? "bg-amber-400" : "bg-emerald-400"
                          }`}
                          style={{ width: `${Math.min(100, util.percentage)}%` }}
                        />
                      </div>

                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>{util.isOverBudget ? "Over by " + formatCurrency(spent - bc.limit_amount) : "Remaining: " + formatCurrency(util.remaining)}</span>
                        <span>{100 - util.percentage > 0 ? `${(100 - util.percentage).toFixed(0)}% free` : "0% free"}</span>
                      </div>
                    </div>

                    {/* Inline Limit Adjuster Slider */}
                    <div className="pt-2 border-t border-border/50">
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                        <span>Adjust Limit Slider</span>
                        <span className="font-bold text-foreground">₹{toMajorUnits(bc.limit_amount).toLocaleString()}</span>
                      </div>
                      <input
                        type="range"
                        min="2000"
                        max="50000"
                        step="1000"
                        value={toMajorUnits(bc.limit_amount)}
                        onChange={(e) => handleUpdateCategoryLimit(cat.id, Number(e.target.value))}
                        className="w-full accent-primary cursor-pointer"
                      />
                    </div>

                    {/* Quick Simulation Buttons */}
                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleQuickCategorySpend(cat, 500)}
                        className="flex-1 h-7 text-[10px] font-semibold border-border hover:bg-surface"
                      >
                        + ₹500 Spend
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleQuickCategorySpend(cat, 2000)}
                        className="flex-1 h-7 text-[10px] font-semibold border-border hover:bg-surface"
                      >
                        + ₹2,000 Spend
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* PLAYGROUND 4: SAVINGS GOAL PLAYGROUND */}
        {/* ======================================================== */}
        {activeTab === "goals" && (
          <div className="space-y-6 animate-fade-in">
            <div className="p-4 rounded-2xl border border-border bg-card/60">
              <h3 className="text-sm font-bold text-foreground">Savings Goal & Contribution Pacing</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Simulate goal contributions, change target amounts or dates, and view transparent mathematical pacing plans.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {goals.map((goal) => {
                const plan = calculateGoalMonthlyTarget(goal.target_amount, goal.current_amount, goal.target_date);
                const pct = Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 1000) / 10);

                return (
                  <Card key={goal.id} className="p-5 border-border bg-card/70 space-y-4 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                          {pct}% Complete
                        </Badge>
                        <span className="text-[10px] text-muted-foreground uppercase font-mono">{goal.category}</span>
                      </div>

                      <h4 className="text-base font-bold text-foreground">{goal.name}</h4>

                      {/* Amount Progress */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-extrabold text-foreground">{formatCurrency(goal.current_amount)}</span>
                          <span className="text-muted-foreground">{formatCurrency(goal.target_amount)}</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-border overflow-hidden">
                          <div className="h-full bg-primary transition-all duration-300" style={{ width: `${pct}%` }} />
                        </div>
                      </div>

                      {/* Pacing Calculation Plan Box */}
                      <div className="p-3 rounded-xl bg-surface/70 border border-border/60 text-xs space-y-1.5">
                        <p className="font-semibold text-foreground text-[11px] flex items-center gap-1.5">
                          <CalendarClock className="h-3.5 w-3.5 text-primary" />
                          Recommended Pacing Plan
                        </p>
                        <div className="flex justify-between text-[11px]">
                          <span className="text-muted-foreground">Remaining Needed:</span>
                          <span className="font-mono font-bold text-amber-300">{formatCurrency(plan.remainingMinor)}</span>
                        </div>
                        <div className="flex justify-between text-[11px]">
                          <span className="text-muted-foreground">Target Horizon:</span>
                          <span className="font-mono font-bold text-cyan-300">{plan.monthsRemaining} Months</span>
                        </div>
                        <div className="flex justify-between text-[11px] pt-1 border-t border-border/50">
                          <span className="text-muted-foreground font-semibold">Monthly Deposit:</span>
                          <span className="font-mono font-extrabold text-primary">{formatCurrency(plan.recommendedMonthlyMinor)}/mo</span>
                        </div>
                      </div>

                      {/* Interactive Target Adjuster Slider */}
                      <div className="space-y-1 pt-1">
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>Adjust Target Goal</span>
                          <span className="font-bold text-foreground">₹{toMajorUnits(goal.target_amount).toLocaleString()}</span>
                        </div>
                        <input
                          type="range"
                          min="50000"
                          max="1000000"
                          step="10000"
                          value={toMajorUnits(goal.target_amount)}
                          onChange={(e) => handleUpdateGoalTarget(goal, Number(e.target.value))}
                          className="w-full accent-primary cursor-pointer"
                        />
                      </div>

                      {/* Target Date Adjuster */}
                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-border/40">
                        <span className="text-muted-foreground">Target Date:</span>
                        <input
                          type="date"
                          value={goal.target_date || ""}
                          onChange={(e) => handleUpdateGoalDate(goal, e.target.value)}
                          className="bg-surface border border-border rounded px-2 py-0.5 text-[11px] font-mono text-foreground cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Quick & Custom Contribution Buttons */}
                    <div className="pt-3 border-t border-border flex items-center gap-1.5">
                      <Button
                        size="sm"
                        onClick={() => {
                          fyzaStore.contributeToGoal(goal.id, 500000, "Quick demo +₹5k");
                          toast.success(`Added ₹5,000 to ${goal.name}!`);
                        }}
                        className="flex-1 h-8 text-[11px] font-bold bg-primary text-black hover:bg-primary/90"
                      >
                        + ₹5k
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          fyzaStore.contributeToGoal(goal.id, 1000000, "Quick demo +₹10k");
                          toast.success(`Added ₹10,000 to ${goal.name}!`);
                        }}
                        className="flex-1 h-8 text-[11px] font-bold bg-surface border border-border hover:bg-surface-elevated text-foreground"
                      >
                        + ₹10k
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setContributingGoal(goal);
                          setContributionAmount("5000");
                        }}
                        className="h-8 px-2.5 text-[11px] font-semibold border-border text-foreground hover:bg-surface"
                      >
                        + Custom
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Custom Goal Contribution Dialog */}
            <Dialog open={contributingGoal !== null} onOpenChange={(open) => !open && setContributingGoal(null)}>
              <DialogContent className="max-w-md bg-card border-border">
                <DialogHeader>
                  <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    Contribute to {contributingGoal?.name}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Contribution Amount (₹)</label>
                    <Input
                      type="number"
                      min="100"
                      step="500"
                      value={contributionAmount}
                      onChange={(e) => setContributionAmount(e.target.value)}
                      placeholder="Enter deposit amount"
                      className="text-xs bg-surface"
                    />
                  </div>
                  <div className="flex gap-2">
                    {["2500", "5000", "10000", "25000"].map((preset) => (
                      <Button
                        key={preset}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setContributionAmount(preset)}
                        className="text-[10px] h-7 flex-1"
                      >
                        ₹{Number(preset).toLocaleString()}
                      </Button>
                    ))}
                  </div>
                </div>
                <DialogFooter className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setContributingGoal(null)}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      const amt = parseFloat(contributionAmount);
                      if (isNaN(amt) || amt <= 0) {
                        toast.error("Please enter a valid contribution amount.");
                        return;
                      }
                      handleRecordContribution(amt);
                    }}
                    className="bg-primary text-black font-semibold hover:bg-primary/90 text-xs"
                  >
                    Deposit ₹{Number(contributionAmount || 0).toLocaleString()}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {/* ======================================================== */}
        {/* PLAYGROUND 5: FYZA AI ASSISTANT PREVIEW */}
        {/* ======================================================== */}
        {activeTab === "ai" && (
          <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
            {/* Grounding Header */}
            <div className="p-5 rounded-2xl border border-secondary/30 bg-secondary/10 space-y-2">
              <div className="flex items-center gap-2 text-secondary font-bold text-sm">
                <Bot className="h-5 w-5" />
                <span>Financial Assistant Preview</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                This preview connects directly to your active demo ledger. It computes answers in real time based on your transactions, category totals, and budget limits.
              </p>
            </div>

            {/* Prompt Chips */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Click a Sample Question:
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  "Where did most of my money go?",
                  "How much did I spend on food?",
                  "How much remains in my budget?",
                  "How can I reach my savings goal?",
                ].map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => runAiQuery(q)}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-surface border border-border hover:border-secondary/50 hover:bg-secondary/10 transition-all text-foreground flex items-center gap-1.5"
                  >
                    <Sparkles className="h-3 w-3 text-secondary" />
                    <span>{q}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Question Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (aiQuestion.trim()) runAiQuery(aiQuestion.trim());
              }}
              className="flex items-center gap-2"
            >
              <Input
                placeholder="Ask anything about your demo finances (e.g. 'How much did I save this month?')..."
                value={aiQuestion}
                onChange={(e) => setAiQuestion(e.target.value)}
                className="bg-surface border-border text-xs h-10"
              />
              <Button
                type="submit"
                disabled={isAiThinking}
                className="bg-secondary text-white font-bold text-xs h-10 px-5 shrink-0"
              >
                {isAiThinking ? "Computing..." : "Ask Demo AI"}
              </Button>
            </form>

            {/* AI Response Card */}
            {aiAnswer && (
              <div className="p-6 rounded-2xl border border-secondary/40 bg-secondary/10 space-y-4 animate-fade-in backdrop-blur-md">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-foreground flex items-center gap-2">
                    <Bot className="h-4 w-4 text-secondary" />
                    Fyza AI Grounded Output
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono">{aiAnswer.timestamp}</span>
                </div>

                <p className="text-sm text-foreground leading-relaxed font-normal">
                  &quot;{aiAnswer.text}&quot;
                </p>

                {aiAnswer.chips && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-3 border-t border-secondary/20">
                    {aiAnswer.chips.map((chip, idx) => (
                      <div key={idx} className="p-2.5 rounded-xl bg-surface/70 border border-border/50">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground">{chip.label}</p>
                        <p className={`text-sm font-extrabold mt-0.5 ${chip.color || "text-foreground"}`}>
                          {chip.value}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* DIALOGS */}
      {/* ======================================================== */}

      {/* Add / Edit Transaction Dialog */}
      <Dialog open={isTxDialogOpen} onOpenChange={setIsTxDialogOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              {editingTx ? "Edit Demo Transaction" : `Add Sample ${txFormData.type}`}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveTransaction} className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Description *</label>
              <Input
                placeholder="e.g. Swiggy Gourmet, Client Consulting"
                value={txFormData.description}
                onChange={(e) => setTxFormData({ ...txFormData, description: e.target.value })}
                required
                className="bg-surface border-border text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Amount (₹) *</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="2500.00"
                  value={txFormData.amount}
                  onChange={(e) => setTxFormData({ ...txFormData, amount: e.target.value })}
                  required
                  className="bg-surface border-border font-mono text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Type *</label>
                <Select
                  value={txFormData.type}
                  onValueChange={(v: TransactionType) => setTxFormData({ ...txFormData, type: v })}
                >
                  <SelectTrigger className="bg-surface border-border text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Category</label>
                <Select
                  value={txFormData.category_id}
                  onValueChange={(v) => setTxFormData({ ...txFormData, category_id: v })}
                >
                  <SelectTrigger className="bg-surface border-border text-xs">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Date</label>
                <Input
                  type="date"
                  value={txFormData.transaction_date}
                  onChange={(e) => setTxFormData({ ...txFormData, transaction_date: e.target.value })}
                  className="bg-surface border-border text-xs"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsTxDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-primary text-black font-bold">
                {editingTx ? "Save Changes" : "Record Transaction"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingTx} onOpenChange={(open) => !open && setDeletingTx(null)}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">Delete Demo Transaction</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            Are you sure you want to delete &quot;{deletingTx?.description}&quot;? Account balances and category totals will update automatically.
          </p>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setDeletingTx(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteTransaction}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
