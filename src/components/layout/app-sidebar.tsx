"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  PieChart,
  Target,
  BarChart3,
  TrendingUp,
  Bot,
  Wallet,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  FileText,
  CreditCard,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/auth-provider";

const NAV_ITEMS = [
  { label: "Overview", href: "/app", icon: LayoutDashboard },
  { label: "Transactions", href: "/app/transactions", icon: ArrowLeftRight },
  { label: "Subscriptions", href: "/app/subscriptions", icon: CreditCard },
  { label: "Calendar", href: "/app/calendar", icon: Calendar, badge: "New" },
  { label: "Budgets", href: "/app/budgets", icon: PieChart },
  { label: "Savings Goals", href: "/app/goals", icon: Target },
  { label: "Analytics", href: "/app/analytics", icon: BarChart3 },
  { label: "Forecast", href: "/app/forecast", icon: TrendingUp },
  { label: "Assistant", href: "/app/ai-assistant", icon: Bot },
  { label: "Accounts", href: "/app/accounts", icon: Wallet },
  { label: "Reports", href: "/app/reports", icon: FileText },
  { label: "Settings", href: "/app/settings", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { isDemoMode } = useAuth();

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300 z-30 select-none relative",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
        <Link href="/app" className="flex items-center gap-3 overflow-hidden group">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">
            <span className="font-extrabold text-black text-xl tracking-tight">F</span>
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-extrabold text-lg text-foreground tracking-tight flex items-center gap-1.5">
                Fyza
                <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/25">
                  PRO
                </span>
              </span>
              <span className="text-[10px] text-muted-foreground font-medium truncate">
                Personal Finance
              </span>
            </div>
          )}
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="h-7 w-7 items-center justify-center rounded-lg border border-border bg-surface hover:bg-surface-elevated text-muted-foreground hover:text-foreground transition-colors flex"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Demo Mode Banner */}
      {isDemoMode && !collapsed && (
        <div className="mx-3 mt-3 px-3 py-2 rounded-xl bg-primary/10 border border-primary/20 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
          <div className="text-[11px] min-w-0">
            <p className="font-bold text-foreground truncate">Interactive Demo</p>
            <p className="text-muted-foreground text-[10px]">Sample ledger active</p>
          </div>
        </div>
      )}

      {/* Navigation Items */}
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/app" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all duration-200 relative",
                isActive
                  ? "bg-primary text-black font-bold shadow-md shadow-primary/25"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0 transition-transform group-hover:scale-110",
                  isActive ? "text-black" : "text-muted-foreground group-hover:text-primary"
                )}
              />
              {!collapsed && (
                <span className="truncate flex-1 tracking-tight">{item.label}</span>
              )}
              {!collapsed && item.badge && (
                <span
                  className={cn(
                    "text-[10px] font-extrabold px-1.5 py-0.5 rounded-full flex items-center gap-0.5",
                    isActive
                      ? "bg-black/20 text-black"
                      : "bg-primary/20 text-primary border border-primary/30"
                  )}
                >
                  <Sparkles className="h-2 w-2" />
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* AI Assistant Quick Card (when expanded) */}
      {!collapsed && (
        <div className="p-3 border-t border-sidebar-border">
          <Link
            href="/app/ai-assistant"
            className="flex flex-col gap-2 p-3 rounded-2xl bg-gradient-to-br from-surface to-surface-secondary border border-border/80 hover:border-primary/50 transition-all group shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                  <Bot className="h-3.5 w-3.5" />
                </div>
                <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                  Fyza AI Advisor
                </span>
              </div>
              <Sparkles className="h-3 w-3 text-primary animate-pulse" />
            </div>
            <p className="text-[11px] text-muted-foreground leading-snug">
              &quot;Can I afford a ₹45,000 purchase this month?&quot;
            </p>
          </Link>
        </div>
      )}
    </aside>
  );
}
