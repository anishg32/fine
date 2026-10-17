"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  LayoutDashboard,
  ArrowLeftRight,
  PieChart,
  Target,
  BarChart3,
  TrendingUp,
  Bot,
  Wallet,
  Settings,
  FileText,
  CreditCard,
  Calendar,
  Plus,
  Sparkles,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { fyzaStore } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";
import type { Account, Transaction, Goal } from "@/lib/types";

interface GlobalSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenAddTransaction?: () => void;
  onOpenAiTransaction?: () => void;
}

export function GlobalSearchDialog({
  open,
  onOpenChange,
  onOpenAddTransaction,
  onOpenAiTransaction,
}: GlobalSearchDialogProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setAccounts(fyzaStore.getAccounts());
      setTransactions(fyzaStore.getTransactions());
      setGoals(fyzaStore.getGoals());
    }
  }, [open]);

  const navItems = [
    { label: "Overview", href: "/app", icon: LayoutDashboard, category: "Navigation" },
    { label: "Transactions", href: "/app/transactions", icon: ArrowLeftRight, category: "Navigation" },
    { label: "Subscriptions & Bills", href: "/app/subscriptions", icon: CreditCard, category: "Navigation" },
    { label: "Financial Calendar", href: "/app/calendar", icon: Calendar, category: "Navigation" },
    { label: "Budgets", href: "/app/budgets", icon: PieChart, category: "Navigation" },
    { label: "Savings Goals", href: "/app/goals", icon: Target, category: "Navigation" },
    { label: "Analytics", href: "/app/analytics", icon: BarChart3, category: "Navigation" },
    { label: "Forecast", href: "/app/forecast", icon: TrendingUp, category: "Navigation" },
    { label: "Fyza AI Assistant", href: "/app/ai-assistant", icon: Bot, category: "Navigation" },
    { label: "Accounts", href: "/app/accounts", icon: Wallet, category: "Navigation" },
    { label: "Financial Reports", href: "/app/reports", icon: FileText, category: "Navigation" },
    { label: "Settings", href: "/app/settings", icon: Settings, category: "Navigation" },
  ];

  const filteredNav = navItems.filter((item) =>
    item.label.toLowerCase().includes(query.toLowerCase())
  );

  const filteredAccounts = accounts.filter((a) =>
    a.name.toLowerCase().includes(query.toLowerCase()) ||
    a.type.toLowerCase().includes(query.toLowerCase())
  );

  const filteredTransactions = transactions
    .filter(
      (t) =>
        t.description.toLowerCase().includes(query.toLowerCase()) ||
        (t.merchant && t.merchant.toLowerCase().includes(query.toLowerCase()))
    )
    .slice(0, 5);

  const filteredGoals = goals.filter((g) =>
    g.name.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 max-w-xl overflow-hidden border-border bg-card shadow-2xl rounded-2xl">
        <DialogTitle className="sr-only">Search Fyza Platform</DialogTitle>
        <div className="flex items-center px-4 border-b border-border bg-surface">
          <Search className="h-4 w-4 text-muted-foreground mr-3 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search transactions, accounts, goals, or jump to page..."
            className="w-full h-13 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            autoFocus
          />
          <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
            ESC
          </kbd>
        </div>

        <div className="max-h-96 overflow-y-auto p-2 space-y-3">
          {/* Quick Actions */}
          {!query && (
            <div className="px-2 py-1 space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                Quick Actions
              </span>
              {onOpenAiTransaction && (
                <button
                  onClick={() => {
                    onOpenChange(false);
                    onOpenAiTransaction();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-gradient-to-r from-primary/15 via-surface to-primary/5 border border-primary/30 hover:border-primary/60 text-left text-sm transition-all group shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-7 w-7 rounded-lg bg-primary text-black flex items-center justify-center font-bold">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="font-bold text-foreground block text-xs">
                        AI Natural Language Quick-Add
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        Type or speak plain sentences (e.g. Spent 450 on coffee)
                      </span>
                    </div>
                  </div>
                  <kbd className="hidden sm:inline-flex h-5 items-center rounded bg-primary/20 text-primary border border-primary/30 px-1.5 text-[10px] font-mono">
                    ⌘J
                  </kbd>
                </button>
              )}
              {onOpenAddTransaction && (
                <button
                  onClick={() => {
                    onOpenChange(false);
                    onOpenAddTransaction();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-surface-secondary text-left text-sm text-primary transition-colors group"
                >
                  <div className="h-7 w-7 rounded-lg bg-primary/20 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-black transition-colors">
                    <Plus className="h-4 w-4" />
                  </div>
                  <span className="font-semibold text-foreground text-xs">Record New Transaction (Form)</span>
                </button>
              )}
            </div>
          )}

          {/* AI Natural Language Query Match */}
          {query.trim().length > 2 && onOpenAiTransaction && (
            <div className="px-2 py-1">
              <button
                onClick={() => {
                  onOpenChange(false);
                  onOpenAiTransaction();
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-gradient-to-r from-primary/15 via-surface to-primary/5 border border-primary/30 hover:border-primary text-left transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-lg bg-primary text-black flex items-center justify-center shrink-0">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-foreground block">
                      AI Natural Language: Log &quot;{query}&quot;
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      Automatically extract amount, category, account & date
                    </span>
                  </div>
                </div>
                <kbd className="hidden sm:inline-flex h-5 items-center rounded bg-primary/20 text-primary border border-primary/30 px-1.5 text-[10px] font-mono">
                  ↵ Enter
                </kbd>
              </button>
            </div>
          )}

          {/* Navigation Matches */}
          {filteredNav.length > 0 && (
            <div className="px-2 py-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Pages & Tools
              </span>
              <div className="mt-1 space-y-0.5">
                {filteredNav.slice(0, 5).map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.href}
                      onClick={() => handleSelect(item.href)}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-surface-secondary text-left text-xs font-medium text-foreground transition-colors group"
                    >
                      <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Accounts */}
          {filteredAccounts.length > 0 && query && (
            <div className="px-2 py-1 border-t border-border/60">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Accounts & Cards
              </span>
              <div className="mt-1 space-y-0.5">
                {filteredAccounts.map((acc) => (
                  <button
                    key={acc.id}
                    onClick={() => handleSelect("/app/accounts")}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-surface-secondary text-left text-xs text-foreground transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <CreditCard className="h-4 w-4 text-cyan-400" />
                      <span className="font-medium">{acc.name}</span>
                    </div>
                    <span className="font-bold text-primary">
                      {formatCurrency(acc.current_balance, acc.currency)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Transactions */}
          {filteredTransactions.length > 0 && query && (
            <div className="px-2 py-1 border-t border-border/60">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Matching Transactions
              </span>
              <div className="mt-1 space-y-0.5">
                {filteredTransactions.map((tx) => (
                  <button
                    key={tx.id}
                    onClick={() => handleSelect("/app/transactions")}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-surface-secondary text-left text-xs text-foreground transition-colors"
                  >
                    <div className="truncate max-w-[280px]">
                      <p className="font-medium truncate">{tx.description}</p>
                      <p className="text-[10px] text-muted-foreground">{tx.transaction_date}</p>
                    </div>
                    <span
                      className={`font-bold whitespace-nowrap ${
                        tx.type === "income"
                          ? "text-emerald-400"
                          : tx.type === "transfer"
                          ? "text-cyan-400"
                          : "text-rose-400"
                      }`}
                    >
                      {tx.type === "income" ? "+" : tx.type === "transfer" ? "⇄ " : "-"}
                      {formatCurrency(tx.amount, tx.currency)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Goals */}
          {filteredGoals.length > 0 && query && (
            <div className="px-2 py-1 border-t border-border/60">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Savings Goals
              </span>
              <div className="mt-1 space-y-0.5">
                {filteredGoals.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => handleSelect("/app/goals")}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-surface-secondary text-left text-xs text-foreground transition-colors"
                  >
                    <span className="font-medium">{g.name}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {Math.round((g.current_amount / g.target_amount) * 100)}% complete
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {query &&
            filteredNav.length === 0 &&
            filteredAccounts.length === 0 &&
            filteredTransactions.length === 0 &&
            filteredGoals.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-6">
                No results found for &quot;{query}&quot;.
              </p>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
