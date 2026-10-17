"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  FileText,
  Download,
  Printer,
  Calendar,
  TrendingUp,
  TrendingDown,
  Building2,
  PieChart,
  CheckCircle2,
  FileSpreadsheet,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fyzaStore } from "@/lib/store";
import { formatCurrency, toMajorUnits } from "@/lib/utils";
import {
  calculateTotalBalance,
  calculatePeriodIncome,
  calculatePeriodExpenses,
  calculateNetCashFlow,
  calculateSavingsRate,
} from "@/lib/calculations";
import type { Account, Transaction, Category } from "@/lib/types";
import { toast } from "sonner";

export default function ReportsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [period, setPeriod] = useState<"this_month" | "last_month" | "ytd">("this_month");

  const loadData = () => {
    setAccounts(fyzaStore.getAccounts());
    setTransactions(fyzaStore.getTransactions());
    setCategories(fyzaStore.getCategories());
  };

  useEffect(() => {
    loadData();
    window.addEventListener("fyza_store_updated", loadData);
    return () => window.removeEventListener("fyza_store_updated", loadData);
  }, []);

  const currency = accounts[0]?.currency || "INR";

  // Filter transactions based on selected period
  const filteredTransactions = useMemo(() => {
    if (period === "this_month") {
      return transactions.filter((t) => t.transaction_date.startsWith("2026-10"));
    }
    if (period === "last_month") {
      return transactions.filter((t) => t.transaction_date.startsWith("2026-09"));
    }
    // Year to date 2026
    return transactions.filter((t) => t.transaction_date.startsWith("2026-"));
  }, [transactions, period]);

  // Income, Expenses, Net Flow (strictly excluding transfers)
  const incomeTxs = useMemo(
    () => filteredTransactions.filter((t) => t.type === "income"),
    [filteredTransactions]
  );
  const expenseTxs = useMemo(
    () => filteredTransactions.filter((t) => t.type === "expense"),
    [filteredTransactions]
  );
  const transferTxs = useMemo(
    () => filteredTransactions.filter((t) => t.type === "transfer"),
    [filteredTransactions]
  );

  const totalIncomeMinor = useMemo(() => calculatePeriodIncome(filteredTransactions), [filteredTransactions]);
  const totalExpenseMinor = useMemo(() => calculatePeriodExpenses(filteredTransactions), [filteredTransactions]);
  const netCashFlowMinor = useMemo(
    () => calculateNetCashFlow(totalIncomeMinor, totalExpenseMinor),
    [totalIncomeMinor, totalExpenseMinor]
  );
  const savingsRate = useMemo(
    () => calculateSavingsRate(totalIncomeMinor, totalExpenseMinor),
    [totalIncomeMinor, totalExpenseMinor]
  );

  const totalLiquidAssetsMinor = useMemo(
    () =>
      accounts
        .filter((a) => !a.is_archived && a.type !== "credit")
        .reduce((sum, a) => sum + Math.max(0, a.current_balance), 0),
    [accounts]
  );

  const totalLiabilitiesMinor = useMemo(
    () =>
      accounts
        .filter((a) => !a.is_archived && a.type === "credit")
        .reduce((sum, a) => sum + Math.abs(Math.min(0, a.current_balance)), 0),
    [accounts]
  );

  const netWorthMinor = calculateTotalBalance(accounts);

  // Group expenses by category
  const expensesByCategory = useMemo(() => {
    const map = new Map<string, number>();
    expenseTxs.forEach((tx) => {
      const cat = categories.find((c) => c.id === tx.category_id)?.name || "Uncategorized";
      map.set(cat, (map.get(cat) || 0) + tx.amount);
    });
    return Array.from(map.entries())
      .map(([name, amount]) => ({
        name,
        amount,
        percentage: totalExpenseMinor > 0 ? ((amount / totalExpenseMinor) * 100).toFixed(1) : "0",
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [expenseTxs, categories, totalExpenseMinor]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const headers = ["Date", "Description", "Type", "Category", "Amount", "Account", "Merchant"];
    const rows = filteredTransactions.map((tx) => {
      const catName = categories.find((c) => c.id === tx.category_id)?.name || tx.type;
      const accName = accounts.find((a) => a.id === tx.account_id)?.name || "Default Account";
      return [
        tx.transaction_date,
        `"${tx.description.replace(/"/g, '""')}"`,
        tx.type,
        `"${catName}"`,
        (toMajorUnits(tx.amount)).toFixed(2),
        `"${accName}"`,
        `"${(tx.merchant || "").replace(/"/g, '""')}"`,
      ].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `fyza_financial_report_${period}_2026.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Financial statement exported as CSV");
  };

  const periodLabel =
    period === "this_month"
      ? "October 2026"
      : period === "last_month"
      ? "September 2026"
      : "Calendar Year 2026 (YTD)";

  return (
    <div className="space-y-6">
      {/* Top Header & Export Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <FileText className="h-7 w-7 text-primary" />
            Financial Statement & Reports
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Audit-ready statement of cash flows, balance sheet, and spending breakdown.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="text-xs font-semibold rounded-xl gap-1.5 border-border hover:bg-surface-elevated"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print / PDF</span>
          </Button>
          <Button
            size="sm"
            onClick={handleExportCSV}
            className="text-xs font-bold rounded-xl gap-1.5 bg-primary text-black hover:bg-primary/90 shadow-sm shadow-primary/20"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* Period Selector Tabs */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <Tabs value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
          <TabsList className="bg-surface border border-border p-1 rounded-xl">
            <TabsTrigger value="this_month" className="text-xs font-semibold rounded-lg px-3 py-1.5">
              This Month (Oct 2026)
            </TabsTrigger>
            <TabsTrigger value="last_month" className="text-xs font-semibold rounded-lg px-3 py-1.5">
              Last Month (Sep 2026)
            </TabsTrigger>
            <TabsTrigger value="ytd" className="text-xs font-semibold rounded-lg px-3 py-1.5">
              Full Year 2026 (YTD)
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
          <Calendar className="h-3.5 w-3.5 text-primary" />
          Statement Period: <strong className="text-foreground">{periodLabel}</strong>
        </span>
      </div>

      {/* Primary Statement Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-2xl border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Total Inflows
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-emerald-400">
              {formatCurrency(totalIncomeMinor, currency)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              From {incomeTxs.length} verified income credits
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Operating Outflows
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-rose-400">
              {formatCurrency(totalExpenseMinor, currency)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Across {expenseTxs.length} expense debits
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Net Cash Flow
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-black ${
                netCashFlowMinor >= 0 ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {netCashFlowMinor >= 0 ? "+" : ""}
              {formatCurrency(netCashFlowMinor, currency)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Net Savings Margin: <strong className="text-foreground">{savingsRate}%</strong>
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Tracked Net Worth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-primary">
              {formatCurrency(netWorthMinor, currency)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Assets less credit card liabilities
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Two Column Section: Cash Flow Statement & Balance Sheet */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cash Flow Statement */}
        <Card className="rounded-2xl border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Statement of Cash Flows
            </CardTitle>
            <CardDescription className="text-xs">
              Operating inflows, living expenses, and isolated account transfers
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-border/60">
                <span className="font-semibold text-foreground">Gross Operating Income</span>
                <span className="font-bold text-emerald-400">
                  +{formatCurrency(totalIncomeMinor, currency)}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border/60">
                <span className="font-medium text-muted-foreground">Total Living & Discretionary Expenses</span>
                <span className="font-bold text-rose-400">
                  -{formatCurrency(totalExpenseMinor, currency)}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border/60">
                <span className="font-medium text-muted-foreground">
                  Inter-Account Transfers (Neutral Flow)
                </span>
                <span className="font-bold text-cyan-400">
                  ⇄ {formatCurrency(transferTxs.reduce((s, t) => s + t.amount, 0), currency)}
                </span>
              </div>
              <div className="flex justify-between py-2.5 pt-3 font-bold text-sm bg-surface-secondary/40 px-3 rounded-xl border border-border">
                <span className="text-foreground">Net Operating Surplus / (Deficit)</span>
                <span className={netCashFlowMinor >= 0 ? "text-emerald-400" : "text-rose-400"}>
                  {netCashFlowMinor >= 0 ? "+" : ""}
                  {formatCurrency(netCashFlowMinor, currency)}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-surface/80 border border-border flex items-start gap-3">
              <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-bold text-foreground">Financial Health Analysis</p>
                <p className="text-muted-foreground mt-0.5 leading-relaxed">
                  Your savings rate of {savingsRate}% is well above the recommended 20% benchmark.
                  Positive surplus of {formatCurrency(Math.max(0, netCashFlowMinor), currency)} is
                  available to fund your emergency reserve and index fund SIPs.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Balance Sheet Summary */}
        <Card className="rounded-2xl border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Building2 className="h-4 w-4 text-cyan-400" />
              Balance Sheet Summary
            </CardTitle>
            <CardDescription className="text-xs">
              Consolidated assets and liabilities across all managed accounts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-border/60">
                <span className="font-semibold text-foreground">Liquid Bank Accounts & Reserves</span>
                <span className="font-bold text-foreground">
                  {formatCurrency(totalLiquidAssetsMinor, currency)}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border/60">
                <span className="font-medium text-muted-foreground">Credit Card Liabilities</span>
                <span className="font-bold text-rose-400">
                  {totalLiabilitiesMinor > 0 ? `-${formatCurrency(totalLiabilitiesMinor, currency)}` : "₹0.00"}
                </span>
              </div>
              <div className="flex justify-between py-2.5 pt-3 font-bold text-sm bg-surface-secondary/40 px-3 rounded-xl border border-border">
                <span className="text-foreground">Consolidated Net Worth</span>
                <span className="text-primary font-black">
                  {formatCurrency(netWorthMinor, currency)}
                </span>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Account Breakdown
              </span>
              <div className="space-y-1.5">
                {accounts.map((acc) => (
                  <div
                    key={acc.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-surface/50 border border-border/60 text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="h-2 w-2 rounded-full bg-primary" />
                      <span className="font-semibold text-foreground truncate">{acc.name}</span>
                      <span className="text-[10px] text-muted-foreground capitalize">({acc.type})</span>
                    </div>
                    <span
                      className={`font-bold ${
                        acc.current_balance < 0 ? "text-rose-400" : "text-foreground"
                      }`}
                    >
                      {formatCurrency(acc.current_balance, acc.currency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Expenses Breakdown Table */}
      <Card className="rounded-2xl border-border bg-card">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <PieChart className="h-4 w-4 text-amber-400" />
              Category Outflow Analysis
            </CardTitle>
            <CardDescription className="text-xs">
              Ranked distribution of spending for {periodLabel}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground font-bold">
                  <th className="pb-2.5">Category</th>
                  <th className="pb-2.5">Share of Total</th>
                  <th className="pb-2.5 text-right">Total Expensed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {expensesByCategory.map((cat, idx) => (
                  <tr key={cat.name} className="hover:bg-surface-secondary/40 transition-colors">
                    <td className="py-3 font-semibold text-foreground flex items-center gap-2">
                      <span className="text-muted-foreground text-[10px]">#{idx + 1}</span>
                      <span>{cat.name}</span>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-24 sm:w-36 h-2 bg-surface-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${Math.min(100, parseFloat(cat.percentage))}%` }}
                          />
                        </div>
                        <span className="text-muted-foreground font-medium">{cat.percentage}%</span>
                      </div>
                    </td>
                    <td className="py-3 text-right font-bold text-foreground">
                      {formatCurrency(cat.amount, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
