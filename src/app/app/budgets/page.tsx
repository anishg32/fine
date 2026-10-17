"use client";

import React, { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { fyzaStore } from "@/lib/store";
import { calculatePeriodExpenses } from "@/lib/calculations";
import { formatCurrency, toMinorUnits, toMajorUnits } from "@/lib/utils";
import type { Budget, Category, Transaction } from "@/lib/types";
import { toast } from "sonner";

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [budgetName, setBudgetName] = useState("");
  const [totalLimitMajor, setTotalLimitMajor] = useState("");

  const [currentMonth, setCurrentMonth] = useState(10);
  const [currentYear, setCurrentYear] = useState(2026);
  const [monthPrefix, setMonthPrefix] = useState("2026-10");

  const loadData = () => {
    setBudgets(fyzaStore.getBudgets());
    setCategories(fyzaStore.getCategories().filter((c) => c.type === "expense"));
    setTransactions(fyzaStore.getTransactions());
  };

  useEffect(() => {
    loadData();
    const d = new Date();
    const m = d.getMonth() + 1;
    const y = d.getFullYear();
    setCurrentMonth(m);
    setCurrentYear(y);
    setMonthPrefix(`${y}-${String(m).padStart(2, "0")}`);

    window.addEventListener("fyza_store_updated", loadData);
    return () => window.removeEventListener("fyza_store_updated", loadData);
  }, []);

  const currentMonthExpenses = transactions.filter(
    (t) => t.type === "expense" && t.transaction_date.startsWith(monthPrefix)
  );

  const activeBudget =
    budgets.find((b) => b.is_active && b.month === currentMonth && b.year === currentYear) ||
    budgets[0];

  const totalSpent = calculatePeriodExpenses(currentMonthExpenses);
  const totalLimit = activeBudget ? activeBudget.total_limit : 0;
  const utilization = totalLimit > 0 ? (totalSpent / totalLimit) * 100 : 0;
  const remaining = Math.max(0, totalLimit - totalSpent);

  // Category breakdown calculation
  const categorySpending = categories.map((cat) => {
    const spent = currentMonthExpenses
      .filter((t) => t.category_id === cat.id)
      .reduce((sum, t) => sum + t.amount, 0);

    const budgetCat = activeBudget?.categories?.find((c) => c.category_id === cat.id);
    const limit = budgetCat ? budgetCat.limit_amount : Math.round(totalLimit / Math.max(1, categories.length));
    const catUtil = limit > 0 ? (spent / limit) * 100 : 0;

    return {
      cat,
      spent,
      limit,
      utilization: catUtil,
      remaining: Math.max(0, limit - spent),
    };
  }).filter((item) => item.spent > 0 || (activeBudget && item.limit > 0));

  const handleOpenCreate = () => {
    setEditingBudget(null);
    setBudgetName(`${new Date().toLocaleString("en-US", { month: "long" })} Budget`);
    setTotalLimitMajor(activeBudget ? String(toMajorUnits(activeBudget.total_limit)) : "80000");
    setIsDialogOpen(true);
  };

  const handleSaveBudget = (e: React.FormEvent) => {
    e.preventDefault();
    const limitVal = parseFloat(totalLimitMajor);
    if (isNaN(limitVal) || limitVal <= 0) {
      toast.error("Please enter a valid budget amount.");
      return;
    }

    fyzaStore.saveBudget({
      id: editingBudget?.id,
      name: budgetName.trim() || "Monthly Budget",
      month: currentMonth,
      year: currentYear,
      total_limit: toMinorUnits(limitVal),
    });

    toast.success("Budget updated successfully.");
    setIsDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
            Budget Management
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Set deliberate caps and preserve financial peace of mind.
          </p>
        </div>
        <Button
          onClick={handleOpenCreate}
          className="bg-primary text-black font-semibold hover:bg-primary/90 text-xs flex items-center gap-1.5 shadow-sm shadow-primary/20"
        >
          <Plus className="h-4 w-4" /> Edit / Create Budget
        </Button>
      </div>

      {/* Main Budget Card */}
      {activeBudget && (
        <Card className="border-primary/30 bg-gradient-to-br from-card to-surface">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  {activeBudget.name}
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-primary/15 text-primary">
                    Active
                  </span>
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Target month:{" "}
                  {new Date(activeBudget.year, activeBudget.month - 1).toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-muted-foreground">Total Budget Limit</span>
                <p className="text-2xl font-extrabold text-foreground">
                  {formatCurrency(totalLimit, "INR")}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="font-semibold text-foreground">
                  Spent: {formatCurrency(totalSpent, "INR")} ({utilization.toFixed(1)}%)
                </span>
                <span className="font-semibold text-emerald-400">
                  Remaining: {formatCurrency(remaining, "INR")}
                </span>
              </div>
              <Progress
                value={Math.min(100, utilization)}
                indicatorClassName={
                  utilization > 100
                    ? "bg-rose-500"
                    : utilization > 85
                    ? "bg-amber-400"
                    : "bg-primary"
                }
                className="h-3"
              />
            </div>

            {/* Threshold Milestones */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              {[50, 75, 90, 100].map((threshold) => {
                const passed = utilization >= threshold;
                return (
                  <div
                    key={threshold}
                    className={`p-2.5 rounded-lg border text-center transition-colors ${
                      passed
                        ? threshold === 100
                          ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                          : "bg-amber-500/10 border-amber-500/30 text-amber-400"
                        : "bg-surface border-border text-muted-foreground"
                    }`}
                  >
                    <p className="text-xs font-bold">{threshold}% Threshold</p>
                    <p className="text-[10px] mt-0.5 font-medium">
                      {passed ? "Triggered" : "On track"}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category Allocations Grid */}
      <div>
        <h3 className="text-base font-bold text-foreground mb-4">
          Category Allocations & Spent
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {categorySpending.map(({ cat, spent, limit, utilization: catUtil, remaining: catRem }) => (
            <Card key={cat.id} className="hover:border-primary/40 transition-colors">
              <CardContent className="p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-7 w-7 rounded-lg flex items-center justify-center text-xs font-bold"
                      style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
                    >
                      {cat.name[0]}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-foreground">{cat.name}</h4>
                      <p className="text-[10px] text-muted-foreground">
                        Limit: {formatCurrency(limit, "INR")}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-foreground">
                      {formatCurrency(spent, "INR")}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {catUtil.toFixed(1)}% used
                    </p>
                  </div>
                </div>

                <Progress
                  value={Math.min(100, catUtil)}
                  indicatorClassName={
                    catUtil > 100
                      ? "bg-rose-500"
                      : catUtil > 85
                      ? "bg-amber-400"
                      : "bg-primary"
                  }
                  className="h-2"
                />

                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>{catRem > 0 ? `${formatCurrency(catRem, "INR")} left` : "Limit reached"}</span>
                  <span className={catUtil > 100 ? "text-rose-400 font-semibold" : "text-emerald-400"}>
                    {catUtil > 100 ? "Over budget" : "Healthy"}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Budget Creation/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingBudget ? "Edit Monthly Budget" : "Configure Monthly Budget"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveBudget} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Budget Name</Label>
              <Input
                value={budgetName}
                onChange={(e) => setBudgetName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Overall Monthly Limit (₹)</Label>
              <Input
                type="number"
                step="1000"
                value={totalLimitMajor}
                onChange={(e) => setTotalLimitMajor(e.target.value)}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-primary text-black font-semibold hover:bg-primary/90">
                Save Budget
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
