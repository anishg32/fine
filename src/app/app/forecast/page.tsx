"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Sliders,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Percent,
  ShieldCheck,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { fyzaStore } from "@/lib/store";
import {
  calculateTotalBalance,
  calculatePeriodIncome,
  calculatePeriodExpenses,
  simulateWhatIfScenarios,
  calculateEmergencyBuffer,
} from "@/lib/calculations";
import { formatCurrency } from "@/lib/utils";
import type { Account } from "@/lib/types";

export default function ForecastPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [activeTab, setActiveTab] = useState<"simulator" | "runway">("simulator");

  // User adjustable assumptions (stored in major currency units for intuitive editing)
  const [projectionMonths, setProjectionMonths] = useState<number>(12);
  const [startingBalanceMajor, setStartingBalanceMajor] = useState<number>(405399);
  const [monthlyIncomeMajor, setMonthlyIncomeMajor] = useState<number>(145000);
  const [essentialExpensesMajor, setEssentialExpensesMajor] = useState<number>(33849);
  const [discretionaryExpensesMajor, setDiscretionaryExpensesMajor] = useState<number>(15000);
  const [discretionaryTrimPct, setDiscretionaryTrimPct] = useState<number>(15);
  const [oneTimeExpenseMajor, setOneTimeExpenseMajor] = useState<number>(0);
  const [startYear, setStartYear] = useState(2026);
  const [startMonth, setStartMonth] = useState(9); // 0-indexed (October)
  const [hasLoadedStore, setHasLoadedStore] = useState(false);

  const loadData = useCallback(() => {
    const accs = fyzaStore.getAccounts();
    const txs = fyzaStore.getTransactions();
    setAccounts(accs);

    if (!hasLoadedStore && accs.length > 0) {
      const bal = calculateTotalBalance(accs);
      setStartingBalanceMajor(Math.round(bal / 100));

      const inc = calculatePeriodIncome(txs.filter((t) => t.type === "income"));
      if (inc > 0) setMonthlyIncomeMajor(Math.round(inc / 100));

      const exp = calculatePeriodExpenses(txs.filter((t) => t.type === "expense"));
      if (exp > 0) {
        // Estimate 65% essential / 35% discretionary split
        const totalExpMajor = Math.round(exp / 100);
        setEssentialExpensesMajor(Math.round(totalExpMajor * 0.68));
        setDiscretionaryExpensesMajor(Math.round(totalExpMajor * 0.32));
      }
      setHasLoadedStore(true);
    }
  }, [hasLoadedStore]);

  useEffect(() => {
    loadData();
    const d = new Date();
    setStartYear(d.getFullYear());
    setStartMonth(d.getMonth());

    window.addEventListener("fyza_store_updated", loadData);
    return () => window.removeEventListener("fyza_store_updated", loadData);
  }, [loadData]);

  // Execute What-If Simulation via deterministic calculation engine
  const simulationResult = useMemo(() => {
    return simulateWhatIfScenarios({
      startingBalanceMinor: startingBalanceMajor * 100,
      monthlyIncomeMinor: monthlyIncomeMajor * 100,
      essentialExpensesMinor: essentialExpensesMajor * 100,
      discretionaryExpensesMinor: discretionaryExpensesMajor * 100,
      discretionaryReductionPct: discretionaryTrimPct,
      oneTimeUpcomingExpensesMinor: oneTimeExpenseMajor * 100,
      projectionMonths,
      startYear,
      startMonth,
    });
  }, [
    startingBalanceMajor,
    monthlyIncomeMajor,
    essentialExpensesMajor,
    discretionaryExpensesMajor,
    discretionaryTrimPct,
    oneTimeExpenseMajor,
    projectionMonths,
    startYear,
    startMonth,
  ]);

  // Execute Emergency Buffer Analysis via deterministic calculation engine
  const emergencyAnalysis = useMemo(() => {
    return calculateEmergencyBuffer({
      accounts,
      essentialMonthlyExpenseMinor: essentialExpensesMajor * 100,
    });
  }, [accounts, essentialExpensesMajor]);

  const cons = simulationResult.conservative;
  const exp = simulationResult.expected;
  const opt = simulationResult.optimistic;

  const startingBalanceMinor = startingBalanceMajor * 100;
  const consGrowth = cons.finalBalance - startingBalanceMinor;
  const expGrowth = exp.finalBalance - startingBalanceMinor;
  const optGrowth = opt.finalBalance - startingBalanceMinor;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Forecast & Runway Simulator
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-surface border border-border text-muted-foreground">
              Dynamic Projections
            </span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Simulate future wealth trajectories, test discretionary spending cuts, and measure emergency runway resilience.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-surface p-1 rounded-xl border border-border">
          <Button
            size="sm"
            variant={activeTab === "simulator" ? "default" : "ghost"}
            onClick={() => setActiveTab("simulator")}
            className="text-xs h-8 px-3"
          >
            <Sliders className="h-3.5 w-3.5 mr-1.5" /> Scenario Simulator
          </Button>
          <Button
            size="sm"
            variant={activeTab === "runway" ? "default" : "ghost"}
            onClick={() => setActiveTab("runway")}
            className="text-xs h-8 px-3"
          >
            <ShieldCheck className="h-3.5 w-3.5 mr-1.5" /> Emergency Runway ({emergencyAnalysis.monthsCovered}m)
          </Button>
        </div>
      </div>

      {activeTab === "simulator" ? (
        <>
          {/* Assumptions Control Panel */}
          <Card className="border-border bg-card/60 backdrop-blur-sm shadow-sm">
            <CardHeader className="pb-3 border-b border-border/60">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Sliders className="h-4 w-4 text-primary" />
                    Customizable Model Assumptions
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Adjust financial variables to see multi-scenario projections update in real time.
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground mr-1">Horizon:</span>
                  {[3, 6, 12, 24, 36].map((m) => (
                    <Button
                      key={m}
                      size="sm"
                      variant={projectionMonths === m ? "default" : "outline"}
                      onClick={() => setProjectionMonths(m)}
                      className="h-7 px-2.5 text-xs"
                    >
                      {m}m
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {/* Starting Balance */}
                <div className="space-y-1.5">
                  <Label htmlFor="start-bal" className="text-xs font-semibold text-foreground flex items-center justify-between">
                    <span>Starting Tracked Balance</span>
                    <span className="text-[10px] text-muted-foreground">Liquid across accounts</span>
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-muted-foreground">₹</span>
                    <Input
                      id="start-bal"
                      type="number"
                      min="0"
                      step="1000"
                      value={startingBalanceMajor}
                      onChange={(e) => setStartingBalanceMajor(parseFloat(e.target.value) || 0)}
                      className="h-9 pl-7 text-xs bg-surface font-semibold"
                    />
                  </div>
                </div>

                {/* Monthly Income */}
                <div className="space-y-1.5">
                  <Label htmlFor="inc" className="text-xs font-semibold text-foreground flex items-center justify-between">
                    <span>Expected Monthly Income</span>
                    <span className="text-[10px] text-muted-foreground">Salary / inflows</span>
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-muted-foreground">₹</span>
                    <Input
                      id="inc"
                      type="number"
                      min="0"
                      step="1000"
                      value={monthlyIncomeMajor}
                      onChange={(e) => setMonthlyIncomeMajor(parseFloat(e.target.value) || 0)}
                      className="h-9 pl-7 text-xs bg-surface font-semibold text-primary"
                    />
                  </div>
                </div>

                {/* Essential Expenses */}
                <div className="space-y-1.5">
                  <Label htmlFor="ess-exp" className="text-xs font-semibold text-foreground flex items-center justify-between">
                    <span>Essential Living Outflow</span>
                    <span className="text-[10px] text-muted-foreground">Rent, food, EMI, bills</span>
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-muted-foreground">₹</span>
                    <Input
                      id="ess-exp"
                      type="number"
                      min="0"
                      step="500"
                      value={essentialExpensesMajor}
                      onChange={(e) => setEssentialExpensesMajor(parseFloat(e.target.value) || 0)}
                      className="h-9 pl-7 text-xs bg-surface font-semibold"
                    />
                  </div>
                </div>

                {/* Discretionary Expenses */}
                <div className="space-y-1.5">
                  <Label htmlFor="disc-exp" className="text-xs font-semibold text-foreground flex items-center justify-between">
                    <span>Discretionary Outflow</span>
                    <span className="text-[10px] text-muted-foreground">Dining, shopping, travel</span>
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-muted-foreground">₹</span>
                    <Input
                      id="disc-exp"
                      type="number"
                      min="0"
                      step="500"
                      value={discretionaryExpensesMajor}
                      onChange={(e) => setDiscretionaryExpensesMajor(parseFloat(e.target.value) || 0)}
                      className="h-9 pl-7 text-xs bg-surface font-semibold"
                    />
                  </div>
                </div>

                {/* Discretionary Trim Slider */}
                <div className="space-y-1.5 sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="disc-trim" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Percent className="h-3.5 w-3.5 text-primary" />
                      Discretionary Expense Trim: <span className="text-primary font-bold">{discretionaryTrimPct}%</span>
                    </Label>
                    <span className="text-[11px] font-bold text-primary">
                      Frees +{formatCurrency(simulationResult.discretionaryReductionSavingsMonthly, "INR")}/mo (+{formatCurrency(simulationResult.discretionaryReductionSavingsTotal, "INR")} total)
                    </span>
                  </div>
                  <input
                    id="disc-trim"
                    type="range"
                    min="0"
                    max="50"
                    step="5"
                    value={discretionaryTrimPct}
                    onChange={(e) => setDiscretionaryTrimPct(parseInt(e.target.value, 10))}
                    className="w-full accent-primary h-2 bg-surface rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>0% (No reduction)</span>
                    <span>15% (Moderate discipline)</span>
                    <span>30% (Aggressive saving)</span>
                    <span>50% (Max austerity)</span>
                  </div>
                </div>

                {/* One-time upcoming expense */}
                <div className="space-y-1.5 sm:col-span-3">
                  <Label htmlFor="onetime" className="text-xs font-semibold text-foreground flex items-center justify-between">
                    <span>One-Time Planned Capital Expense (Applies in Month 2)</span>
                    <span className="text-[10px] text-muted-foreground">E.g., Laptop, vacation, insurance renewal</span>
                  </Label>
                  <div className="relative max-w-sm">
                    <span className="absolute left-3 top-2.5 text-xs text-muted-foreground">₹</span>
                    <Input
                      id="onetime"
                      type="number"
                      min="0"
                      step="5000"
                      value={oneTimeExpenseMajor}
                      onChange={(e) => setOneTimeExpenseMajor(parseFloat(e.target.value) || 0)}
                      className="h-9 pl-7 text-xs bg-surface font-semibold"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Three Documented Scenarios */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Conservative */}
            <Card className="border-amber-500/20 bg-amber-500/5 hover:border-amber-500/40 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Badge variant="warning" className="text-[10px] font-bold">
                    Scenario 1: Conservative
                  </Badge>
                  <span className="text-[10px] text-muted-foreground font-mono">{projectionMonths}m Horizon</span>
                </div>
                <CardTitle className="text-2xl font-extrabold mt-2 text-foreground">
                  {formatCurrency(cons.finalBalance, "INR")}
                </CardTitle>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                  <span className={consGrowth >= 0 ? "text-amber-400 font-semibold" : "text-rose-400 font-semibold"}>
                    {consGrowth >= 0 ? "+" : ""}{formatCurrency(consGrowth, "INR")}
                  </span>
                  <span>net trajectory</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-xs text-muted-foreground border-t border-border/60 pt-3">
                <p className="font-semibold text-foreground text-[11px] uppercase tracking-wider">Documented Assumptions:</p>
                {cons.assumptions.map((a, i) => (
                  <p key={i} className="flex items-start gap-1.5 leading-relaxed">
                    <span className="text-amber-400 font-bold">•</span>
                    <span>{a}</span>
                  </p>
                ))}
              </CardContent>
            </Card>

            {/* Expected */}
            <Card className="border-primary/50 bg-primary/5 shadow-md hover:border-primary transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Badge variant="default" className="text-[10px] font-bold">
                    Scenario 2: Expected (Base Case)
                  </Badge>
                  <span className="text-[10px] text-primary font-mono">{projectionMonths}m Horizon</span>
                </div>
                <CardTitle className="text-2xl font-extrabold mt-2 text-foreground">
                  {formatCurrency(exp.finalBalance, "INR")}
                </CardTitle>
                <div className="flex items-center gap-1 text-xs mt-0.5">
                  <span className="text-primary font-bold flex items-center">
                    <ArrowUpRight className="h-3.5 w-3.5 mr-0.5" />
                    +{formatCurrency(expGrowth, "INR")}
                  </span>
                  <span className="text-muted-foreground">projected net growth</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-xs text-muted-foreground border-t border-primary/20 pt-3">
                <p className="font-semibold text-foreground text-[11px] uppercase tracking-wider">Documented Assumptions:</p>
                {exp.assumptions.map((a, i) => (
                  <p key={i} className="flex items-start gap-1.5 leading-relaxed">
                    <span className="text-primary font-bold">•</span>
                    <span>{a}</span>
                  </p>
                ))}
              </CardContent>
            </Card>

            {/* Optimistic */}
            <Card className="border-cyan-500/20 bg-cyan-500/5 hover:border-cyan-500/40 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Badge variant="info" className="text-[10px] font-bold">
                    Scenario 3: Optimistic
                  </Badge>
                  <span className="text-[10px] text-muted-foreground font-mono">{projectionMonths}m Horizon</span>
                </div>
                <CardTitle className="text-2xl font-extrabold mt-2 text-cyan-400">
                  {formatCurrency(opt.finalBalance, "INR")}
                </CardTitle>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                  <span className="text-cyan-400 font-semibold flex items-center">
                    <ArrowUpRight className="h-3.5 w-3.5 mr-0.5" />
                    +{formatCurrency(optGrowth, "INR")}
                  </span>
                  <span>max upside growth</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-xs text-muted-foreground border-t border-border/60 pt-3">
                <p className="font-semibold text-foreground text-[11px] uppercase tracking-wider">Documented Assumptions:</p>
                {opt.assumptions.map((a, i) => (
                  <p key={i} className="flex items-start gap-1.5 leading-relaxed">
                    <span className="text-cyan-400 font-bold">•</span>
                    <span>{a}</span>
                  </p>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Month-by-Month Trajectory Table */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold">Projected Month-End Balances & Flow</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Month-by-month trajectory comparison over {projectionMonths} months.
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  All values in INR (₹)
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground font-semibold">
                      <th className="pb-2.5">Month</th>
                      <th className="pb-2.5 text-right">Inflow (Exp)</th>
                      <th className="pb-2.5 text-right">Outflow (Exp)</th>
                      <th className="pb-2.5 text-right">Surplus (Exp)</th>
                      <th className="pb-2.5 text-right text-amber-400">Conservative</th>
                      <th className="pb-2.5 text-right text-primary font-bold">Expected</th>
                      <th className="pb-2.5 text-right text-cyan-400">Optimistic</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {exp.trajectory.map((item, idx) => (
                      <tr key={idx} className="hover:bg-surface-secondary/50 transition-colors">
                        <td className="py-2.5 font-semibold text-foreground flex items-center gap-1.5">
                          <span className="text-[10px] text-muted-foreground font-mono w-4">#{item.monthIndex}</span>
                          <span>{item.monthLabel}</span>
                        </td>
                        <td className="py-2.5 text-right text-muted-foreground">
                          {formatCurrency(item.income, "INR")}
                        </td>
                        <td className="py-2.5 text-right text-muted-foreground">
                          {formatCurrency(item.expenses, "INR")}
                        </td>
                        <td className="py-2.5 text-right font-medium text-foreground">
                          {formatCurrency(item.surplus, "INR")}
                        </td>
                        <td className="py-2.5 text-right text-muted-foreground">
                          {formatCurrency(cons.trajectory[idx]?.balance || 0, "INR")}
                        </td>
                        <td className="py-2.5 text-right font-bold text-primary">
                          {formatCurrency(item.balance, "INR")}
                        </td>
                        <td className="py-2.5 text-right font-semibold text-cyan-400">
                          {formatCurrency(opt.trajectory[idx]?.balance || 0, "INR")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        /* PART 6: EMERGENCY BUFFER ANALYSIS VIEW */
        <div className="space-y-6">
          <Card className="border-primary/20 bg-gradient-to-br from-card to-surface">
            <CardHeader className="pb-3 border-b border-border/60">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    Emergency Runway Analysis
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Measures how many months your verified liquid cash reserves cover essential living expenses.
                  </p>
                </div>
                <Badge
                  variant={
                    emergencyAnalysis.status === "Robust"
                      ? "default"
                      : emergencyAnalysis.status === "Adequate"
                      ? "info"
                      : "warning"
                  }
                  className="text-xs font-bold px-2.5 py-1"
                >
                  {emergencyAnalysis.status} Buffer
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-5 space-y-6">
              {/* Runway KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-surface border border-border">
                  <p className="text-xs text-muted-foreground">Liquid Available Cash</p>
                  <p className="text-xl font-bold text-foreground mt-1">
                    {formatCurrency(emergencyAnalysis.liquidBalanceMinor, "INR")}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {emergencyAnalysis.accountsIncluded.length} accounts qualified
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-surface border border-border">
                  <p className="text-xs text-muted-foreground">Essential Monthly Burn</p>
                  <p className="text-xl font-bold text-foreground mt-1">
                    {formatCurrency(emergencyAnalysis.essentialMonthlyExpenseMinor, "INR")}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Non-negotiable living needs
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-primary/10 border border-primary/30">
                  <p className="text-xs text-primary font-semibold">Months Covered</p>
                  <p className="text-3xl font-bold tracking-tight tabular-nums text-primary mt-0.5">
                    {emergencyAnalysis.monthsCovered}
                    <span className="text-sm font-semibold ml-1 text-muted-foreground">months</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Target baseline: 3 to 6 months
                  </p>
                </div>
              </div>

              {/* Explanation statement */}
              <div className="p-4 rounded-xl bg-surface-secondary border border-border text-xs leading-relaxed text-foreground">
                <p className="font-semibold flex items-center gap-1.5 text-primary">
                  <CheckCircle2 className="h-4 w-4" /> Assessment Findings:
                </p>
                <p className="mt-1 text-muted-foreground">{emergencyAnalysis.explanation}</p>
                {emergencyAnalysis.shortfallMinor > 0 && (
                  <p className="mt-2 text-amber-400 font-semibold">
                    • Recommended 6-month safety buffer target: {formatCurrency(emergencyAnalysis.sixMonthTargetMinor, "INR")}{" "}
                    (Shortfall: {formatCurrency(emergencyAnalysis.shortfallMinor, "INR")}).
                  </p>
                )}
              </div>

              {/* Included vs Excluded Accounts Audit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-3.5 rounded-xl border border-border bg-surface space-y-2">
                  <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Included Liquid Accounts
                  </p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    {emergencyAnalysis.accountsIncluded.map((acc, i) => (
                      <li key={i} className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                        <span>{acc}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-3.5 rounded-xl border border-border bg-surface space-y-2">
                  <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-400" /> Excluded from Cash Reserves
                  </p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    {emergencyAnalysis.accountsExcluded.length > 0 ? (
                      emergencyAnalysis.accountsExcluded.map((acc, i) => (
                        <li key={i} className="flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                          <span>{acc}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-[11px] italic">No non-liquid or investment accounts detected.</li>
                    )}
                  </ul>
                  <p className="text-[10px] text-muted-foreground italic pt-1">
                    Investment portfolios, stock brokerages, and credit lines are excluded to prevent volatile or borrowed funds from inflating true liquid runway.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Limitations and Uncertainty Disclosure */}
      <Card className="border-border/60 bg-surface/40">
        <CardContent className="pt-4 space-y-2 text-xs text-muted-foreground leading-relaxed">
          <div className="flex items-center gap-1.5 font-bold text-foreground text-xs">
            <ShieldAlert className="h-4 w-4 text-amber-400 shrink-0" />
            <span>Mathematical Model Disclaimers & Limitations</span>
          </div>
          <ul className="list-disc list-inside space-y-1 pl-1 text-[11px]">
            {simulationResult.limitations.map((lim, idx) => (
              <li key={idx}>{lim}</li>
            ))}
            <li>
              Projections are deterministic calculations based on user-supplied assumptions and do not guarantee market performance or portfolio gains.
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

