"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Calendar,
  Trash2,
  Sliders,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { fyzaStore } from "@/lib/store";
import {
  calculateGoalMonthlyTarget,
  calculateSmartGoalPacing,
  calculatePeriodIncome,
  calculatePeriodExpenses,
  calculateNetCashFlow,
  type SmartGoalPacingOptions,
} from "@/lib/calculations";
import { formatCurrency, toMinorUnits } from "@/lib/utils";
import type { Goal, GoalCategory, Transaction } from "@/lib/types";
import { GOAL_CATEGORIES } from "@/lib/constants";
import { toast } from "sonner";

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isContributeOpen, setIsContributeOpen] = useState(false);
  const [isPacingOpen, setIsPacingOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);

  // Goal Form Fields
  const [name, setName] = useState("");
  const [targetAmountMajor, setTargetAmountMajor] = useState("");
  const [currentAmountMajor, setCurrentAmountMajor] = useState("0");
  const [targetDate, setTargetDate] = useState("");
  const [category, setCategory] = useState<GoalCategory>("emergency");
  const [description, setDescription] = useState("");

  // Contribution Form Field
  const [contributionAmountMajor, setContributionAmountMajor] = useState("");

  const [currentMonthPrefix, setCurrentMonthPrefix] = useState("2026-10");

  const loadData = () => {
    setGoals(fyzaStore.getGoals());
    setTransactions(fyzaStore.getTransactions());
  };

  useEffect(() => {
    loadData();
    const d = new Date();
    setCurrentMonthPrefix(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    window.addEventListener("fyza_store_updated", loadData);
    return () => window.removeEventListener("fyza_store_updated", loadData);
  }, []);

  // Calculate current monthly net cash flow surplus for safe goal pacing
  const monthlyCashSurplus = useMemo(() => {
    const curMonthTxs = transactions.filter((t) => t.transaction_date.startsWith(currentMonthPrefix));
    const income = calculatePeriodIncome(curMonthTxs);
    const expenses = calculatePeriodExpenses(curMonthTxs);
    const net = calculateNetCashFlow(income, expenses);
    return net > 0 ? net : 9615100; // default ₹96,151 if no data
  }, [transactions, currentMonthPrefix]);

  const handleOpenCreate = () => {
    setName("");
    setTargetAmountMajor("");
    setCurrentAmountMajor("0");
    setTargetDate("");
    setCategory("emergency");
    setDescription("");
    setIsCreateOpen(true);
  };

  const handleSaveGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseFloat(targetAmountMajor);
    const initial = parseFloat(currentAmountMajor) || 0;

    if (isNaN(target) || target <= 0) {
      toast.error("Please enter a valid target amount.");
      return;
    }

    fyzaStore.saveGoal({
      name: name.trim(),
      target_amount: toMinorUnits(target),
      current_amount: toMinorUnits(initial),
      target_date: targetDate || null,
      category,
      description: description.trim() || null,
    });

    toast.success("Savings goal established.");
    setIsCreateOpen(false);
  };

  const handleOpenContribute = (goal: Goal) => {
    setSelectedGoal(goal);
    setContributionAmountMajor("");
    setIsContributeOpen(true);
  };

  const handleOpenPacing = (goal: Goal) => {
    setSelectedGoal(goal);
    setIsPacingOpen(true);
  };

  const handleConfirmContribute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoal) return;
    const amount = parseFloat(contributionAmountMajor);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid contribution amount.");
      return;
    }

    fyzaStore.contributeToGoal(selectedGoal.id, toMinorUnits(amount));
    toast.success(`Allocated ${formatCurrency(toMinorUnits(amount), "INR")} toward ${selectedGoal.name}!`);
    setIsContributeOpen(false);
  };

  const handleDeleteGoal = (id: string) => {
    fyzaStore.deleteGoal(id);
    toast.success("Goal removed.");
  };

  const totalSavedAllGoals = goals.reduce((acc, g) => acc + g.current_amount, 0);
  const totalTargetAllGoals = goals.reduce((acc, g) => acc + g.target_amount, 0);
  const aggregatePct = totalTargetAllGoals > 0 ? (totalSavedAllGoals / totalTargetAllGoals) * 100 : 0;

  // Selected goal pacing calculation
  const pacingOptions: SmartGoalPacingOptions | null = useMemo(() => {
    if (!selectedGoal) return null;
    return calculateSmartGoalPacing(selectedGoal, monthlyCashSurplus);
  }, [selectedGoal, monthlyCashSurplus]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            Savings & Financial Goals
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20">
              Smart Pacing Engine
            </span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Turn life milestones into measurable, predictable monthly targets without starving essential living expenses.
          </p>
        </div>
        <Button
          onClick={handleOpenCreate}
          className="bg-primary text-black font-semibold hover:bg-primary/90 text-xs flex items-center gap-1.5 shadow-sm shadow-primary/20"
        >
          <Plus className="h-4 w-4" /> New Savings Goal
        </Button>
      </div>

      {/* Aggregate Overview Card */}
      <Card className="bg-gradient-to-br from-card to-surface border-border">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Total Saved Across All Goals
              </p>
              <h3 className="text-3xl font-extrabold text-foreground mt-1">
                {formatCurrency(totalSavedAllGoals, "INR")}
              </h3>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Combined Target</p>
              <p className="text-xl font-bold text-foreground">
                {formatCurrency(totalTargetAllGoals, "INR")}
              </p>
            </div>
          </div>
          <Progress value={aggregatePct} className="h-3" />
          <p className="text-xs text-muted-foreground mt-2">
            You have funded <span className="font-bold text-primary">{aggregatePct.toFixed(1)}%</span> of your total financial aspirations. Monthly surplus cushion: <span className="font-bold text-foreground">{formatCurrency(monthlyCashSurplus, "INR")}</span>.
          </p>
        </CardContent>
      </Card>

      {/* Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {goals.map((goal) => {
          const pct = Math.min(
            100,
            Math.round((goal.current_amount / goal.target_amount) * 100)
          );
          const isDone = goal.current_amount >= goal.target_amount;
          const pacing = calculateGoalMonthlyTarget(
            goal.target_amount,
            goal.current_amount,
            goal.target_date
          );

          return (
            <Card key={goal.id} className="hover:border-primary/40 transition-colors flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                      {goal.category}
                    </span>
                    <CardTitle className="text-base font-bold text-foreground mt-0.5">
                      {goal.name}
                    </CardTitle>
                  </div>
                  <button
                    onClick={() => handleDeleteGoal(goal.id)}
                    className="text-muted-foreground hover:text-destructive p-1 rounded"
                    title="Delete goal"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {goal.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                    {goal.description}
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-semibold text-foreground">
                      {formatCurrency(goal.current_amount, "INR")}
                    </span>
                    <span className="text-muted-foreground">
                      Target: {formatCurrency(goal.target_amount, "INR")}
                    </span>
                  </div>
                  <Progress
                    value={pct}
                    indicatorClassName={isDone ? "bg-emerald-400" : "bg-primary"}
                    className="h-2.5"
                  />
                  <div className="flex justify-between text-[11px] text-muted-foreground mt-1.5">
                    <span className="font-medium">{pct}% funded</span>
                    <span>
                      {isDone
                        ? "Milestone completed! 🎉"
                        : `${formatCurrency(goal.target_amount - goal.current_amount, "INR")} to go`}
                    </span>
                  </div>
                </div>

                {/* Target Date Pacing Recommendation */}
                {goal.target_date && !isDone && pacing.recommendedMonthlyMinor > 0 && (
                  <div className="p-2.5 rounded-lg bg-surface border border-border text-[11px] text-muted-foreground space-y-0.5">
                    <div className="flex items-center gap-1.5 font-semibold text-foreground">
                      <Calendar className="h-3.5 w-3.5 text-primary" />
                      <span>Target: {goal.target_date}</span>
                    </div>
                    <p>
                      Save <span className="font-bold text-primary">{formatCurrency(pacing.recommendedMonthlyMinor, "INR")}</span> / mo to reach by deadline ({pacing.monthsRemaining} mos).
                    </p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenPacing(goal)}
                    className="flex-1 text-xs font-semibold flex items-center justify-center gap-1"
                  >
                    <Sliders className="h-3.5 w-3.5 text-primary" />
                    Pacing Plan
                  </Button>
                  <Button
                    size="sm"
                    variant={isDone ? "outline" : "default"}
                    onClick={() => handleOpenContribute(goal)}
                    disabled={isDone}
                    className="flex-1 text-xs font-semibold"
                  >
                    {isDone ? "Completed" : "Contribute"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* PART 4: SMART GOAL PACING PLANNER DIALOG */}
      {selectedGoal && pacingOptions && (
        <Dialog open={isPacingOpen} onOpenChange={setIsPacingOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Badge variant="default" className="text-[10px] font-bold">
                  Smart Goal Planner
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Grounded Cash Flow Math
                </span>
              </div>
              <DialogTitle className="text-lg font-bold text-foreground mt-1">
                Savings Pacing: {selectedGoal.name}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              {/* Snapshot Banner */}
              <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-surface border border-border text-center text-xs">
                <div>
                  <p className="text-[11px] text-muted-foreground">Target</p>
                  <p className="font-bold text-foreground mt-0.5">
                    {formatCurrency(pacingOptions.targetAmountMinor, "INR")}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Remaining</p>
                  <p className="font-bold text-primary mt-0.5">
                    {formatCurrency(pacingOptions.remainingAmountMinor, "INR")}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Cash Surplus</p>
                  <p className="font-bold text-emerald-400 mt-0.5">
                    {formatCurrency(pacingOptions.discretionarySurplusMinor, "INR")}/mo
                  </p>
                </div>
              </div>

              {/* Tradeoff Notice if target pace exceeds monthly cash flow */}
              {pacingOptions.tradeoffNotice && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-muted-foreground flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed text-amber-200">
                    {pacingOptions.tradeoffNotice}
                  </p>
                </div>
              )}

              {/* Alternative Contribution Plans Table */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  Alternative Contribution Scenarios
                </p>
                <div className="rounded-xl border border-border overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-surface-secondary text-muted-foreground border-b border-border">
                        <th className="p-2.5 font-semibold">Monthly Pace</th>
                        <th className="p-2.5 font-semibold">Months to Goal</th>
                        <th className="p-2.5 font-semibold text-right">Estimated Date</th>
                        <th className="p-2.5 text-right font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {pacingOptions.fixedPlans.map((plan, idx) => {
                        const fitsSurplus = plan.monthlyContributionMinor <= pacingOptions.discretionarySurplusMinor;
                        return (
                          <tr key={idx} className="hover:bg-surface-secondary/40 transition-colors">
                            <td className="p-2.5 font-bold text-foreground">
                              {formatCurrency(plan.monthlyContributionMinor, "INR")}
                              {!fitsSurplus && (
                                <span className="ml-1 text-[9px] text-amber-400 font-normal">
                                  (Exceeds surplus)
                                </span>
                              )}
                            </td>
                            <td className="p-2.5 text-muted-foreground">
                              {plan.monthsToComplete} months
                            </td>
                            <td className="p-2.5 text-right font-semibold text-primary">
                              {plan.projectedCompletionDate}
                            </td>
                            <td className="p-2.5 text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  fyzaStore.contributeToGoal(selectedGoal.id, plan.monthlyContributionMinor);
                                  toast.success(`Deposited ${formatCurrency(plan.monthlyContributionMinor, "INR")} toward ${selectedGoal.name}!`);
                                  setIsPacingOpen(false);
                                }}
                                className="h-6 text-[10px] px-2"
                              >
                                Deposit Now
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Transparency Notice */}
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                * Note: Pacing calculations use exact minor-unit integer arithmetic and assume 0% speculative investment growth by default to avoid false promises. Realized returns in mutual funds or fixed deposits may accelerate timeline.
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsPacingOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Create Goal Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Savings Goal</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveGoal} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Goal Name</Label>
              <Input
                placeholder="e.g. MacBook Pro, Japan Tour, Emergency Fund"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Target Amount (₹)</Label>
                <Input
                  type="number"
                  step="1000"
                  placeholder="300000"
                  value={targetAmountMajor}
                  onChange={(e) => setTargetAmountMajor(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Already Saved (₹)</Label>
                <Input
                  type="number"
                  step="1000"
                  placeholder="0"
                  value={currentAmountMajor}
                  onChange={(e) => setCurrentAmountMajor(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Target Date</Label>
                <Input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Category</Label>
                <Select value={category} onValueChange={(val: GoalCategory) => setCategory(val)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GOAL_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Description (Optional)</Label>
              <Input
                placeholder="Why is this goal important to you?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-primary text-black font-semibold hover:bg-primary/90">
                Create Goal
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Contribute Dialog */}
      {selectedGoal && (
        <Dialog open={isContributeOpen} onOpenChange={setIsContributeOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Contribute to {selectedGoal.name}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleConfirmContribute} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Deposit Amount (₹)</Label>
                <Input
                  type="number"
                  step="100"
                  placeholder="5000"
                  value={contributionAmountMajor}
                  onChange={(e) => setContributionAmountMajor(e.target.value)}
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Current progress: {formatCurrency(selectedGoal.current_amount, "INR")} of {formatCurrency(selectedGoal.target_amount, "INR")}
              </p>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsContributeOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-primary text-black font-semibold hover:bg-primary/90">
                  Confirm Contribution
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

