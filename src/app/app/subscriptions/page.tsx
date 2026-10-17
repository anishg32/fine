"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  CreditCard,
  Plus,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
  Search,
  Filter,
  Trash2,
  Edit2,
  Power,
  CalendarClock,
  DollarSign,
  ArrowRight,
  ExternalLink,
  Check,
  AlertTriangle,
  RefreshCw,
  Bell,
  BarChart3,
  Archive,
  Info,
  ShieldCheck,
  TrendingDown,
  ChevronDown,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fyzaStore } from "@/lib/store";
import { formatCurrency, toMinorUnits, toMajorUnits } from "@/lib/utils";
import {
  calculateRecurringMonthlyEquivalent,
  calculateRecurringAnnualEquivalent,
  calculateSubscriptionAnalytics,
} from "@/lib/calculations";
import type {
  RecurringTransaction,
  Account,
  Category,
  RecurringFrequency,
  RecurringStatus,
} from "@/lib/types";
import { toast } from "sonner";

const POPULAR_PRESETS = [
  { name: "Netflix 4K Premium", amount: 649, frequency: "monthly" as RecurringFrequency, category: "Subscriptions", merchant: "Netflix", cancellation_url: "https://www.netflix.com/youraccount", method: "Credit Card (AutoPay)" },
  { name: "Spotify Premium Duo", amount: 149, frequency: "monthly" as RecurringFrequency, category: "Subscriptions", merchant: "Spotify", cancellation_url: "https://www.spotify.com/account/subscription", method: "UPI AutoPay" },
  { name: "Amazon Prime Annual", amount: 1499, frequency: "yearly" as RecurringFrequency, category: "Subscriptions", merchant: "Amazon India", cancellation_url: "https://www.amazon.in/prime", method: "Credit Card" },
  { name: "GitHub Copilot Pro", amount: 830, frequency: "monthly" as RecurringFrequency, category: "Subscriptions", merchant: "GitHub", cancellation_url: "https://github.com/settings/billing", method: "Debit Card" },
  { name: "Cult.fit Elite Pass", amount: 1850, frequency: "monthly" as RecurringFrequency, category: "Health & Medical", merchant: "Cult.fit", cancellation_url: "https://www.cult.fit/me/memberships", method: "NetBanking e-Mandate" },
  { name: "JioFiber Gigabit", amount: 1179, frequency: "monthly" as RecurringFrequency, category: "Bills & Utilities", merchant: "Reliance Jio", cancellation_url: "https://www.jio.com/myaccount", method: "Auto-Debit" },
  { name: "Apartment Rent", amount: 32000, frequency: "monthly" as RecurringFrequency, category: "Housing & Rent", merchant: "Society Maintenance", method: "NEFT Auto-Transfer" },
];

export default function SubscriptionsPage() {
  const [mounted, setMounted] = useState(false);
  const [recurring, setRecurring] = useState<RecurringTransaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeTab, setActiveTab] = useState<"subscriptions" | "reminders" | "analytics">("subscriptions");

  // Filters & Search
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | RecurringStatus>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date" | "amount_desc" | "amount_asc" | "name">("date");

  // Modals
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RecurringTransaction | null>(null);
  const [viewingItem, setViewingItem] = useState<RecurringTransaction | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [cancellingItem, setCancellingItem] = useState<RecurringTransaction | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    description: "",
    merchant: "",
    amount: "",
    frequency: "monthly" as RecurringFrequency,
    interval: 1,
    account_id: "",
    category_id: "",
    next_date: "",
    start_date: "",
    end_date: "",
    payment_method_desc: "",
    cancellation_url: "",
    notes: "",
    reminder_days_before: 3,
  });

  const loadData = () => {
    setRecurring(fyzaStore.getRecurring());
    setAccounts(fyzaStore.getAccounts());
    setCategories(fyzaStore.getCategories());
  };

  useEffect(() => {
    setMounted(true);
    loadData();
    // Idempotently scan for bill reminders
    fyzaStore.syncBillReminders();

    window.addEventListener("fyza_store_updated", loadData);
    return () => window.removeEventListener("fyza_store_updated", loadData);
  }, []);

  // Category mapping dictionary
  const categoriesMap = useMemo(() => {
    const map: Record<string, { name: string; color: string; icon: string }> = {};
    categories.forEach((c) => {
      map[c.id] = { name: c.name, color: c.color, icon: c.icon };
    });
    return map;
  }, [categories]);

  // Comprehensive analytics calculation
  const analytics = useMemo(() => {
    return calculateSubscriptionAnalytics(recurring, categoriesMap);
  }, [recurring, categoriesMap]);

  // Filtered and Sorted Subscriptions List
  const filteredList = useMemo(() => {
    return recurring.filter((item) => {
      const itemStatus = item.status || (item.is_active ? "active" : "paused");
      if (statusFilter !== "all" && itemStatus !== statusFilter) return false;
      if (categoryFilter !== "all" && item.category_id !== categoryFilter) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const matchDesc = item.description.toLowerCase().includes(q);
        const matchMerchant = item.merchant?.toLowerCase().includes(q);
        const matchNotes = item.notes?.toLowerCase().includes(q);
        if (!matchDesc && !matchMerchant && !matchNotes) return false;
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === "date") return a.next_date.localeCompare(b.next_date);
      if (sortBy === "amount_desc") return b.amount - a.amount;
      if (sortBy === "amount_asc") return a.amount - b.amount;
      if (sortBy === "name") return a.description.localeCompare(b.description);
      return 0;
    });
  }, [recurring, statusFilter, categoryFilter, search, sortBy]);

  // Form Handlers
  const openCreateDialog = (preset?: typeof POPULAR_PRESETS[0]) => {
    setEditingItem(null);
    const today = new Date().toISOString().split("T")[0];

    let matchedCatId = "";
    if (preset) {
      const found = categories.find((c) => c.name.toLowerCase().includes(preset.category.toLowerCase()));
      if (found) matchedCatId = found.id;
    } else if (categories.length > 0) {
      const found = categories.find((c) => c.name.toLowerCase().includes("subscript"));
      matchedCatId = found ? found.id : categories[0].id;
    }

    setFormData({
      description: preset?.name || "",
      merchant: preset?.merchant || "",
      amount: preset ? String(preset.amount) : "",
      frequency: preset?.frequency || "monthly",
      interval: 1,
      account_id: accounts[0]?.id || "",
      category_id: matchedCatId,
      next_date: today,
      start_date: today,
      end_date: "",
      payment_method_desc: preset?.method || "AutoPay e-Mandate",
      cancellation_url: preset?.cancellation_url || "",
      notes: "",
      reminder_days_before: 3,
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (item: RecurringTransaction) => {
    setEditingItem(item);
    setFormData({
      description: item.description,
      merchant: item.merchant || "",
      amount: String(toMajorUnits(item.amount)),
      frequency: item.frequency,
      interval: item.interval || 1,
      account_id: item.account_id,
      category_id: item.category_id || "",
      next_date: item.next_date,
      start_date: item.start_date || "",
      end_date: item.end_date || "",
      payment_method_desc: item.payment_method_desc || "",
      cancellation_url: item.cancellation_url || "",
      notes: item.notes || "",
      reminder_days_before: item.reminder_days_before || 3,
    });
    setIsDialogOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description.trim()) {
      toast.error("Please enter a service or bill name");
      return;
    }
    const numAmount = parseFloat(formData.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    const minorAmount = toMinorUnits(numAmount);
    const today = new Date().toISOString().split("T")[0];

    if (editingItem) {
      fyzaStore.updateRecurring({
        ...editingItem,
        description: formData.description.trim(),
        merchant: formData.merchant.trim() || null,
        amount: minorAmount,
        frequency: formData.frequency,
        interval: Math.max(1, Number(formData.interval) || 1),
        account_id: formData.account_id || accounts[0]?.id || "acc-1",
        category_id: formData.category_id || null,
        next_date: formData.next_date || editingItem.next_date,
        start_date: formData.start_date || editingItem.start_date,
        end_date: formData.end_date || null,
        payment_method_desc: formData.payment_method_desc.trim() || null,
        cancellation_url: formData.cancellation_url.trim() || null,
        notes: formData.notes.trim() || null,
        reminder_days_before: Number(formData.reminder_days_before) || 3,
      });
      toast.success("Subscription updated successfully");
    } else {
      fyzaStore.addRecurring({
        account_id: formData.account_id || accounts[0]?.id || "acc-1",
        type: "expense",
        amount: minorAmount,
        currency: "INR",
        category_id: formData.category_id || null,
        description: formData.description.trim(),
        merchant: formData.merchant.trim() || null,
        frequency: formData.frequency,
        interval: Math.max(1, Number(formData.interval) || 1),
        start_date: formData.start_date || today,
        end_date: formData.end_date || null,
        next_date: formData.next_date || today,
        is_active: true,
        status: "active",
        payment_method_desc: formData.payment_method_desc.trim() || null,
        cancellation_url: formData.cancellation_url.trim() || null,
        notes: formData.notes.trim() || null,
        reminder_days_before: Number(formData.reminder_days_before) || 3,
        last_generated: null,
      });
      toast.success("New subscription added to tracking ledger");
    }

    setIsDialogOpen(false);
  };

  // Status Actions
  const handleToggleActive = (item: RecurringTransaction) => {
    const isCurrentlyActive = (item.status || (item.is_active ? "active" : "paused")) === "active";
    if (isCurrentlyActive) {
      fyzaStore.pauseRecurring(item.id);
      toast.info(`Paused ${item.description}. Historical records preserved.`);
    } else {
      fyzaStore.resumeRecurring(item.id);
      toast.success(`Resumed ${item.description}. Reminders active.`);
    }
  };

  const handleMarkPaid = (item: RecurringTransaction) => {
    const res = fyzaStore.recordRecurringPayment(item.id);
    if (res.success) {
      toast.success(`Marked ${item.description} as paid (${formatCurrency(item.amount)}). Next renewal scheduled.`);
      if (viewingItem && viewingItem.id === item.id) {
        setViewingItem(null);
      }
    } else {
      toast.error(res.error || "Could not record payment");
    }
  };

  const handleReportMissed = (item: RecurringTransaction) => {
    fyzaStore.recordRecurringMissed(item.id);
    toast.warning(`Reported payment issue for ${item.description}. Added to attention list.`);
  };

  const handleConfirmCancel = () => {
    if (!cancellingItem) return;
    fyzaStore.cancelRecurring(cancellingItem.id);
    toast.info(`Cancelled tracking for ${cancellingItem.description}. Past payments remain in your financial ledger.`);
    setCancellingItem(null);
  };

  const handleDelete = () => {
    if (!deletingId) return;
    fyzaStore.deleteRecurring(deletingId);
    toast.success("Subscription removed");
    setDeletingId(null);
  };

  const handleSyncReminders = () => {
    const created = fyzaStore.syncBillReminders();
    if (created.length > 0) {
      toast.success(`Dispatched ${created.length} new bill reminder(s) to Notification Center.`);
    } else {
      toast.info("All bill reminders are up to date.");
    }
  };

  if (!mounted) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-4">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-sm text-muted-foreground">Loading Subscription Engine...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              Recurring Outflow Engine
            </span>
            <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
              Idempotent Tracking
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Subscriptions & Recurring Bills
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">
            Track renewal dates, audit projected monthly commitments, receive bill reminders, and prevent duplicate charges.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncReminders}
            className="border-border text-foreground hover:bg-surface text-xs font-medium"
          >
            <Bell className="h-3.5 w-3.5 mr-1.5 text-primary" />
            Check Due Reminders
          </Button>
          <Button
            onClick={() => openCreateDialog()}
            className="bg-primary text-black font-bold hover:bg-primary/90 shadow-md shadow-primary/20 text-xs"
          >
            <Plus className="h-4 w-4 mr-1.5 stroke-[2.5]" />
            Add Subscription
          </Button>
        </div>
      </div>

      {/* 5 Top Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <Card className="border-border bg-card/70 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
          <CardHeader className="pb-1.5">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Active Subscriptions
            </p>
            <CardTitle className="text-2xl font-extrabold text-foreground mt-1 flex items-baseline gap-1.5">
              <span>{analytics.activeCount}</span>
              <span className="text-xs font-normal text-muted-foreground">services</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] text-muted-foreground">
              {analytics.pausedCount} paused • {analytics.cancelledCount} cancelled
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/70 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
          <CardHeader className="pb-1.5">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Est. Monthly Outflow
            </p>
            <CardTitle className="text-2xl font-extrabold text-emerald-400 mt-1">
              {formatCurrency(analytics.totalMonthlyRecurringMinor)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] text-muted-foreground">
              Across all monthly, weekly & yearly plans
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/70 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
          <CardHeader className="pb-1.5">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Est. Annual Outflow
            </p>
            <CardTitle className="text-2xl font-extrabold text-cyan-400 mt-1">
              {formatCurrency(analytics.totalAnnualRecurringMinor)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] text-muted-foreground">
              Projected 12-month recurring commitments
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/70 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
          <CardHeader className="pb-1.5">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Upcoming (30 Days)
            </p>
            <CardTitle className="text-2xl font-extrabold text-amber-400 mt-1 flex items-baseline gap-1.5">
              <span>{analytics.upcomingRenewals.filter((r) => r.diffDays >= 0 && r.diffDays <= 30).length}</span>
              <span className="text-xs font-normal text-muted-foreground">due</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] text-muted-foreground truncate">
              {analytics.upcomingRenewals[0]
                ? `Next: ${analytics.upcomingRenewals[0].recurring.description}`
                : "All clear for 30 days"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/70 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />
          <CardHeader className="pb-1.5">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Attention Required
            </p>
            <CardTitle className="text-2xl font-extrabold text-rose-400 mt-1 flex items-baseline gap-1.5">
              <span>{analytics.upcomingRenewals.filter((r) => r.isOverdue || r.isDueToday).length}</span>
              <span className="text-xs font-normal text-muted-foreground">items</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] text-muted-foreground">
              {analytics.upcomingRenewals.some((r) => r.isOverdue)
                ? "Past due bill detected"
                : "No overdue payments"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab("subscriptions")}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "subscriptions"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <CreditCard className="h-4 w-4" />
          <span>Active Subscriptions ({recurring.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("reminders")}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "reminders"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <CalendarClock className="h-4 w-4" />
          <span>Bill Reminders & Timeline</span>
          {analytics.upcomingRenewals.filter((r) => r.diffDays <= 3).length > 0 && (
            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px] px-1.5 py-0 font-bold">
              {analytics.upcomingRenewals.filter((r) => r.diffDays <= 3).length}
            </Badge>
          )}
        </button>
        <button
          onClick={() => setActiveTab("analytics")}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "analytics"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          <span>Subscription Analytics</span>
        </button>
      </div>

      {/* TAB 1: ALL SUBSCRIPTIONS */}
      {activeTab === "subscriptions" && (
        <div className="space-y-6">
          {/* Main Filter & Search Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-surface/50 p-3 rounded-2xl border border-border">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search subscriptions, merchants, notes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs bg-card border-border"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as RecurringStatus | "all")}>
                <SelectTrigger className="w-32 h-9 text-xs bg-card border-border">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>

              {/* Category Filter */}
              <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v)}>
                <SelectTrigger className="w-36 h-9 text-xs bg-card border-border">
                  <SelectValue placeholder="Category" />
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

              {/* Sort Order */}
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as "date" | "amount_desc" | "amount_asc" | "name")}>
                <SelectTrigger className="w-40 h-9 text-xs bg-card border-border">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Next Due Date</SelectItem>
                  <SelectItem value="amount_desc">Amount (High to Low)</SelectItem>
                  <SelectItem value="amount_asc">Amount (Low to High)</SelectItem>
                  <SelectItem value="name">Service Name (A-Z)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Subscriptions Table */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface/60 border-b border-border text-[11px] text-muted-foreground uppercase font-bold tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">Service & Provider</th>
                    <th className="px-5 py-3.5">Category</th>
                    <th className="px-5 py-3.5">Billing Cadence</th>
                    <th className="px-5 py-3.5">Next Due</th>
                    <th className="px-5 py-3.5 text-right">Amount</th>
                    <th className="px-5 py-3.5 text-center">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                        <div className="max-w-xs mx-auto space-y-2">
                          <p className="font-semibold text-foreground">No matching subscriptions</p>
                          <p className="text-xs text-muted-foreground">
                            Try adjusting your filters, searching for another keyword, or adding a new subscription.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredList.map((item) => {
                      const category = categories.find((c) => c.id === item.category_id);
                      const account = accounts.find((a) => a.id === item.account_id);
                      const status = item.status || (item.is_active ? "active" : "paused");

                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-surface/40 transition-colors ${
                            status !== "active" ? "opacity-60" : ""
                          }`}
                        >
                          {/* Service & Provider */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-xl bg-surface border border-border flex items-center justify-center font-bold text-sm text-primary shrink-0">
                                {item.description.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="font-bold text-foreground text-sm truncate">
                                    {item.description}
                                  </p>
                                  {item.cancellation_url && (
                                    <a
                                      href={item.cancellation_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-muted-foreground hover:text-primary transition-colors"
                                      title="Open provider management portal"
                                    >
                                      <ExternalLink className="h-3 w-3" />
                                    </a>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground truncate">
                                  {item.merchant || "Service"} • {item.payment_method_desc || account?.name || "Auto-Debit"}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Category */}
                          <td className="px-5 py-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium bg-surface border border-border text-foreground">
                              {category?.name || "Subscriptions"}
                            </span>
                          </td>

                          {/* Billing Cadence */}
                          <td className="px-5 py-4">
                            <div className="text-xs">
                              <span className="capitalize font-medium text-foreground">{item.frequency}</span>
                              {item.interval > 1 && (
                                <span className="text-muted-foreground"> (every {item.interval})</span>
                              )}
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                ≈ {formatCurrency(calculateRecurringMonthlyEquivalent(item.amount, item.frequency, item.interval))}/mo
                              </p>
                            </div>
                          </td>

                          {/* Next Due */}
                          <td className="px-5 py-4">
                            <span className="text-xs font-semibold text-foreground">
                              {item.next_date}
                            </span>
                            {item.last_paid_date && (
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                Last paid: {item.last_paid_date}
                              </p>
                            )}
                          </td>

                          {/* Amount */}
                          <td className="px-5 py-4 text-right">
                            <span className="font-extrabold text-foreground text-sm">
                              {formatCurrency(item.amount)}
                            </span>
                          </td>

                          {/* Status Badge */}
                          <td className="px-5 py-4 text-center">
                            <button
                              onClick={() => handleToggleActive(item)}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                                status === "active"
                                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25"
                                  : status === "paused"
                                  ? "bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25"
                                  : "bg-zinc-500/15 text-zinc-400 border border-zinc-500/30"
                              }`}
                              title={status === "active" ? "Click to pause" : "Click to resume"}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  status === "active"
                                    ? "bg-emerald-400"
                                    : status === "paused"
                                    ? "bg-amber-400"
                                    : "bg-zinc-400"
                                }`}
                              />
                              <span className="capitalize">{status}</span>
                            </button>
                          </td>

                          {/* Action Buttons */}
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {status === "active" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleMarkPaid(item)}
                                  className="h-8 px-2 text-xs font-semibold text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                                  title="Record payment occurrence into ledger"
                                >
                                  <Check className="h-3.5 w-3.5 mr-1" />
                                  Paid
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setViewingItem(item)}
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                                title="View details"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditDialog(item)}
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                                title="Edit subscription"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setCancellingItem(item)}
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-amber-400"
                                title="Cancel subscription"
                              >
                                <Archive className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeletingId(item.id)}
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-400"
                                title="Delete from tracking"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Presets Bar */}
          <div className="p-4 rounded-2xl border border-border bg-surface/40">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2.5">
              Popular Presets (1-Click Add)
            </h3>
            <div className="flex flex-wrap gap-2">
              {POPULAR_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => openCreateDialog(preset)}
                  className="px-3 py-1.5 rounded-lg border border-border bg-card hover:border-primary/40 text-xs font-medium text-foreground hover:text-primary transition-all flex items-center gap-1.5 group"
                >
                  <Plus className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary" />
                  <span>{preset.name}</span>
                  <span className="text-muted-foreground font-mono">({formatCurrency(toMinorUnits(preset.amount))})</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BILL REMINDERS & TIMELINE */}
      {activeTab === "reminders" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-foreground">
                Chronological Due Date Radar (Next 30 Days)
              </h2>
              <p className="text-xs text-muted-foreground">
                Automated lead-time alerts for impending auto-debits and renewal deadlines.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncReminders}
              className="text-xs border-border"
            >
              <RefreshCw className="h-3 w-3 mr-1.5" />
              Re-scan Ledger
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {analytics.upcomingRenewals.length === 0 ? (
              <div className="col-span-full py-12 text-center text-muted-foreground bg-card rounded-2xl border border-border">
                <CheckCircle2 className="h-8 w-8 text-primary mx-auto mb-2 opacity-60" />
                <p className="font-semibold text-foreground">All subscriptions are up to date</p>
                <p className="text-xs text-muted-foreground mt-1">No upcoming bills scheduled within this window.</p>
              </div>
            ) : (
              analytics.upcomingRenewals.map((r) => {
                const item = r.recurring;
                const isOverdue = r.isOverdue;
                const isToday = r.isDueToday;
                const isUrgent = r.diffDays <= 3 && !isOverdue && !isToday;

                return (
                  <Card
                    key={item.id}
                    className={`border transition-all ${
                      isOverdue
                        ? "border-rose-500/40 bg-rose-500/5 shadow-sm"
                        : isToday
                        ? "border-amber-500/40 bg-amber-500/5 shadow-sm"
                        : isUrgent
                        ? "border-amber-500/20 bg-card"
                        : "border-border bg-card"
                    }`}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-bold text-base text-foreground truncate">{item.description}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {item.merchant || "Service Provider"} • {item.payment_method_desc || "Auto-Debit"}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold ${
                            isOverdue
                              ? "bg-rose-500/15 text-rose-400 border-rose-500/30"
                              : isToday
                              ? "bg-amber-500/15 text-amber-400 border-amber-500/30 animate-pulse"
                              : isUrgent
                              ? "bg-amber-500/10 text-amber-300 border-amber-500/20"
                              : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          }`}
                        >
                          {isOverdue
                            ? `Overdue (${Math.abs(r.diffDays)}d)`
                            : isToday
                            ? "Due Today"
                            : `In ${r.diffDays} days`}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-baseline justify-between pt-2 border-t border-border/60">
                        <div>
                          <p className="text-[11px] text-muted-foreground">Renewal Date</p>
                          <p className="text-xs font-semibold text-foreground">{item.next_date}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[11px] text-muted-foreground">Payment Amount</p>
                          <p className="text-lg font-extrabold text-foreground">{formatCurrency(item.amount)}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          size="sm"
                          onClick={() => handleMarkPaid(item)}
                          className="flex-1 bg-primary text-black font-semibold hover:bg-primary/90 text-xs h-8"
                        >
                          <Check className="h-3.5 w-3.5 mr-1" />
                          Mark Paid
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReportMissed(item)}
                          className="text-xs h-8 border-border text-muted-foreground hover:text-rose-400"
                          title="Report missed or failed renewal"
                        >
                          <AlertTriangle className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 3: SUBSCRIPTION ANALYTICS */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Spending by Category Breakdown */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-base font-bold text-foreground">
                  Recurring Commitments by Category
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Distribution of monthly recurring outflow across spending classifications.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {analytics.categoryBreakdown.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-6 text-center">
                    No active subscriptions tracked.
                  </p>
                ) : (
                  analytics.categoryBreakdown.map((cat) => (
                    <div key={cat.categoryId} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground flex items-center gap-1.5">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: cat.color }}
                          />
                          {cat.category} ({cat.count} service{cat.count > 1 ? "s" : ""})
                        </span>
                        <div className="text-right font-mono">
                          <span className="font-bold text-foreground">
                            {formatCurrency(cat.monthlyAmount)}/mo
                          </span>
                          <span className="text-muted-foreground ml-2">({cat.percentage}%)</span>
                        </div>
                      </div>
                      <div className="h-2 w-full rounded-full bg-surface overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(100, cat.percentage)}%`,
                            backgroundColor: cat.color,
                          }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Top Recurring Commitments */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-base font-bold text-foreground">
                  Highest Recurring Commitments
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Largest recurring line items ranked by normalized monthly cost.
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.upcomingRenewals.slice(0, 5).map((r, i) => (
                    <div
                      key={r.recurring.id}
                      className="p-3 rounded-xl border border-border bg-surface/40 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-xs font-mono font-bold text-muted-foreground w-4">
                          0{i + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-foreground truncate">
                            {r.recurring.description}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {r.recurring.frequency} • {r.recurring.merchant || "Service"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-bold text-foreground">
                          {formatCurrency(r.recurring.amount)}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-mono">
                          {formatCurrency(r.monthlyEquivalent)}/mo
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* VIEW SUBSCRIPTION DETAILS DIALOG */}
      <Dialog open={!!viewingItem} onOpenChange={(open) => !open && setViewingItem(null)}>
        {viewingItem && (
          <DialogContent className="sm:max-w-lg bg-card border-border">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  {viewingItem.description}
                </DialogTitle>
                <Badge
                  variant="outline"
                  className={`text-[10px] font-bold capitalize ${
                    viewingItem.status === "active" || (!viewingItem.status && viewingItem.is_active)
                      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                      : "bg-zinc-500/15 text-zinc-400 border-zinc-500/30"
                  }`}
                >
                  {viewingItem.status || (viewingItem.is_active ? "active" : "paused")}
                </Badge>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-surface/50 border border-border">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Billing Amount</span>
                  <span className="text-base font-extrabold text-foreground">
                    {formatCurrency(viewingItem.amount)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Normalized Monthly</span>
                  <span className="text-base font-extrabold text-emerald-400">
                    {formatCurrency(calculateRecurringMonthlyEquivalent(viewingItem.amount, viewingItem.frequency, viewingItem.interval))}/mo
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-muted-foreground block">Billing Cadence</span>
                  <span className="font-semibold text-foreground capitalize">
                    {viewingItem.frequency} (every {viewingItem.interval || 1})
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Next Due Date</span>
                  <span className="font-semibold text-foreground">{viewingItem.next_date}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Payment Method</span>
                  <span className="font-semibold text-foreground">
                    {viewingItem.payment_method_desc || "Bank Auto-Debit"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Reminder Window</span>
                  <span className="font-semibold text-foreground">
                    {viewingItem.reminder_days_before || 3} days prior
                  </span>
                </div>
              </div>

              {viewingItem.notes && (
                <div className="p-2.5 rounded-lg bg-surface border border-border">
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold mb-1">
                    Notes & Terms
                  </span>
                  <p className="text-foreground leading-relaxed">{viewingItem.notes}</p>
                </div>
              )}

              {viewingItem.cancellation_url && (
                <div className="p-3 rounded-xl bg-secondary/10 border border-secondary/20 flex items-center justify-between gap-3">
                  <div className="text-[11px]">
                    <p className="font-bold text-foreground">Direct Provider Portal</p>
                    <p className="text-muted-foreground">Manage or cancel on the provider&apos;s official portal.</p>
                  </div>
                  <a
                    href={viewingItem.cancellation_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/20 text-secondary hover:bg-secondary/30 text-xs font-semibold shrink-0"
                  >
                    Open Portal
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </div>

            <DialogFooter className="pt-2 flex items-center justify-between sm:justify-between w-full">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewingItem(null)}
                className="text-xs border-border"
              >
                Close
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => handleMarkPaid(viewingItem)}
                  className="bg-primary text-black font-semibold text-xs"
                >
                  <Check className="h-3.5 w-3.5 mr-1" />
                  Mark as Paid
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* ADD / EDIT SUBSCRIPTION DIALOG */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg bg-card border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">
              {editingItem ? "Edit Subscription" : "Add Subscription / Recurring Bill"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Subscription / Service Name *
              </label>
              <Input
                placeholder="e.g. Netflix, Spotify, Cult.fit, Broadband"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
                className="bg-surface border-border text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Amount (₹) *
                </label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="649.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                  className="bg-surface border-border font-mono text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Frequency *
                </label>
                <Select
                  value={formData.frequency}
                  onValueChange={(v: RecurringFrequency) => setFormData({ ...formData, frequency: v })}
                >
                  <SelectTrigger className="bg-surface border-border text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly / Annual</SelectItem>
                    <SelectItem value="quarterly">Quarterly (every 3 mos)</SelectItem>
                    <SelectItem value="biweekly">Bi-weekly (every 2 wks)</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="custom">Custom Interval</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Next Renewal Date *
                </label>
                <Input
                  type="date"
                  value={formData.next_date}
                  onChange={(e) => setFormData({ ...formData, next_date: e.target.value })}
                  required
                  className="bg-surface border-border text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Merchant / Provider
                </label>
                <Input
                  placeholder="e.g. Netflix Inc."
                  value={formData.merchant}
                  onChange={(e) => setFormData({ ...formData, merchant: e.target.value })}
                  className="bg-surface border-border text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Category
                </label>
                <Select
                  value={formData.category_id}
                  onValueChange={(v) => setFormData({ ...formData, category_id: v })}
                >
                  <SelectTrigger className="bg-surface border-border text-xs">
                    <SelectValue placeholder="Select category" />
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
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Payment Account
                </label>
                <Select
                  value={formData.account_id}
                  onValueChange={(v) => setFormData({ ...formData, account_id: v })}
                >
                  <SelectTrigger className="bg-surface border-border text-xs">
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Payment Method Description
                </label>
                <Input
                  placeholder="e.g. HDFC AutoPay, Amex Card"
                  value={formData.payment_method_desc}
                  onChange={(e) => setFormData({ ...formData, payment_method_desc: e.target.value })}
                  className="bg-surface border-border text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Reminder Lead Time (Days)
                </label>
                <Select
                  value={String(formData.reminder_days_before)}
                  onValueChange={(v) => setFormData({ ...formData, reminder_days_before: Number(v) })}
                >
                  <SelectTrigger className="bg-surface border-border text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 day before</SelectItem>
                    <SelectItem value="3">3 days before (Recommended)</SelectItem>
                    <SelectItem value="7">7 days before</SelectItem>
                    <SelectItem value="14">14 days before</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Provider Cancellation / Account Link (Optional)
              </label>
              <Input
                placeholder="https://provider.com/account/cancel"
                value={formData.cancellation_url}
                onChange={(e) => setFormData({ ...formData, cancellation_url: e.target.value })}
                className="bg-surface border-border text-xs"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Fyza tracks payments safely and helps you navigate to provider sites; it never accesses external credentials.
              </p>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Notes
              </label>
              <Input
                placeholder="e.g. Split with room-mate, 4 screens allowed"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="bg-surface border-border text-xs"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="border-border text-foreground text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-primary text-black font-semibold hover:bg-primary/90 text-xs"
              >
                {editingItem ? "Save Changes" : "Track Subscription"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* CANCEL / ARCHIVE CONFIRMATION DIALOG */}
      <Dialog open={!!cancellingItem} onOpenChange={(open) => !open && setCancellingItem(null)}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">
              Cancel Subscription Tracking
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Stop tracking <span className="font-semibold text-foreground">{cancellingItem?.description}</span>? 
            Its status will be updated to <span className="text-amber-400 font-semibold">Cancelled</span>, reminders will cease, but all historical payment transactions will remain intact in your ledger.
          </p>
          <DialogFooter className="pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCancellingItem(null)}
              className="border-border text-foreground text-xs"
            >
              Keep Tracking
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmCancel}
              className="bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs"
            >
              Mark Cancelled
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION DIALOG */}
      <Dialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">
              Remove Subscription
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            Are you sure you want to completely remove this recurring schedule? This action cannot be undone.
          </p>
          <DialogFooter className="pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeletingId(null)}
              className="border-border text-foreground text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              className="bg-rose-500 hover:bg-rose-600 text-white font-semibold text-xs"
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
