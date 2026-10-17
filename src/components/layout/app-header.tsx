"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  Search,
  LogOut,
  User,
  Settings,
  Calendar,
  Check,
  Plus,
  FileText,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/components/providers/auth-provider";
import { fyzaStore } from "@/lib/store";
import { ThemeSelector } from "./theme-selector";
import { GlobalSearchDialog } from "./global-search-dialog";
import type { Notification } from "@/lib/types";

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  "/app": { title: "Financial Overview", subtitle: "Real-time balance, cash flow, and key indicators" },
  "/app/transactions": { title: "Transactions", subtitle: "Track, filter, and audit your money movements" },
  "/app/subscriptions": { title: "Subscriptions & Recurring Bills", subtitle: "Monitor renewals, prevent duplicate charges, and audit recurring costs" },
  "/app/calendar": { title: "Financial Calendar", subtitle: "Chronological cash flow roadmap, renewals, and milestone radar" },
  "/app/budgets": { title: "Budget Planning", subtitle: "Category allocations and spending limits" },
  "/app/goals": { title: "Savings Goals", subtitle: "Track milestones and periodic contributions" },
  "/app/analytics": { title: "Analytics & Trends", subtitle: "Deep dive into financial patterns and breakdown" },
  "/app/forecast": { title: "Financial Forecast", subtitle: "Multi-scenario balance and cash flow projections" },
  "/app/ai-assistant": { title: "Fyza AI Assistant", subtitle: "Context-aware intelligence for your finances" },
  "/app/accounts": { title: "Accounts & Assets", subtitle: "Manage bank accounts, wallets, and cards" },
  "/app/reports": { title: "Financial Reports", subtitle: "Statements, cash flow analysis & export center" },
  "/app/settings": { title: "Settings & Preferences", subtitle: "Theming, currency, data portability, and profile" },
};

export function AppHeader({ onOpenAddTransaction }: { onOpenAddTransaction?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, signOut, isDemoMode } = useAuth();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [dateStr, setDateStr] = useState("Current Period");
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    setDateStr(new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" }));
    setNotifications(fyzaStore.getNotifications());

    const handleUpdate = () => {
      setNotifications(fyzaStore.getNotifications());
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };

    window.addEventListener("fyza_store_updated", handleUpdate);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("fyza_store_updated", handleUpdate);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const currentMeta = PAGE_TITLES[pathname] || {
    title: "Fyza Platform",
    subtitle: "Personal Finance Management",
  };

  const handleMarkAllRead = () => {
    fyzaStore.markAllNotificationsRead();
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  const getInitials = (name?: string | null) => {
    if (!name) return "FZ";
    const parts = name.split(" ");
    return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
  };

  return (
    <>
      <header className="h-16 border-b border-border bg-card/75 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20 transition-colors">
        {/* Left: Page Title & Breadcrumb */}
        <div className="flex flex-col min-w-0 pr-2">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground hidden sm:flex">
            <Link href="/app" className="hover:text-primary transition-colors font-medium">
              Fyza
            </Link>
            <span>/</span>
            <span className="text-foreground font-semibold capitalize truncate">
              {pathname.replace("/app/", "").replace("/app", "Overview") || "Overview"}
            </span>
          </div>
          <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-foreground truncate">
            {currentMeta.title}
          </h1>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Quick Date Indicator */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border bg-surface text-xs font-semibold text-muted-foreground shadow-sm">
            <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
            <span>{dateStr}</span>
          </div>

          {/* Global Search Button */}
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 h-9 px-2.5 sm:px-3 rounded-xl border border-border bg-surface hover:bg-surface-elevated text-xs font-medium text-muted-foreground hover:text-foreground transition-all group shadow-sm"
            title="Global search (Cmd+K)"
            aria-label="Global search"
          >
            <Search className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            <span className="hidden md:inline">Search...</span>
            <kbd className="hidden md:inline-flex h-4 items-center rounded bg-muted px-1 text-[10px] text-muted-foreground font-mono">
              ⌘K
            </kbd>
          </button>

          {/* Quick Add Transaction Button */}
          {onOpenAddTransaction && (
            <Button
              size="sm"
              onClick={onOpenAddTransaction}
              className="hidden sm:inline-flex items-center gap-1.5 bg-primary text-black font-bold hover:bg-primary/90 shadow-md shadow-primary/20 rounded-xl"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              <span>Add Transaction</span>
            </Button>
          )}

          {/* Theme Selector Dropdown */}
          <ThemeSelector />

          {/* Notifications Popover */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="relative h-9 w-9 rounded-xl border border-border bg-surface flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-elevated transition-colors shadow-sm"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-card animate-pulse" />
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-2 rounded-2xl shadow-2xl border-border">
              <div className="flex items-center justify-between px-2 py-1.5">
                <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Notifications
                </span>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs text-primary hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Check className="h-3 w-3" /> Mark all read
                  </button>
                )}
              </div>
              <DropdownMenuSeparator />
              <div className="max-h-72 overflow-y-auto space-y-1.5 py-1">
                {notifications.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">
                    All caught up! No unread notifications.
                  </p>
                ) : (
                  notifications.slice(0, 5).map((n) => (
                    <div
                      key={n.id}
                      className={`p-2.5 rounded-xl text-xs transition-colors border ${
                        n.is_read
                          ? "bg-transparent border-transparent text-muted-foreground"
                          : "bg-surface border-border text-foreground font-medium"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-foreground truncate">{n.title}</p>
                        {!n.is_read && (
                          <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0 ml-2" />
                        )}
                      </div>
                      <p className="text-muted-foreground text-[11px] mt-0.5 leading-relaxed">
                        {n.message}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex items-center gap-2 rounded-full border border-border p-0.5 hover:border-primary/50 transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
                aria-label="User profile"
              >
                <Avatar className="h-8 w-8 border border-primary/20">
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                    {getInitials(profile?.full_name)}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60 p-1.5 rounded-2xl shadow-2xl border-border">
              <DropdownMenuLabel className="font-normal px-2 py-2">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-bold text-foreground leading-none">
                    {profile?.full_name || "Alex Varma"}
                  </p>
                  <p className="text-xs text-muted-foreground leading-none truncate">
                    {profile?.email || user?.email || "alex@fyza.finance"}
                  </p>
                  {isDemoMode && (
                    <div className="inline-flex items-center gap-1 text-[10px] font-bold text-primary mt-1 px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20 w-fit">
                      <Sparkles className="h-2.5 w-2.5" />
                      Demo Mode Active
                    </div>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/app/settings" className="cursor-pointer py-2 rounded-lg">
                  <User className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>Profile & Security</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/app/reports" className="cursor-pointer py-2 rounded-lg">
                  <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>Financial Statements</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/app/settings" className="cursor-pointer py-2 rounded-lg">
                  <Settings className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>Preferences & Theme</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive cursor-pointer py-2 rounded-lg">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Global Spotlight Search Modal */}
      <GlobalSearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onOpenAddTransaction={onOpenAddTransaction}
      />
    </>
  );
}
