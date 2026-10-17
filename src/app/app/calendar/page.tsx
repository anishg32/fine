"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Filter,
  CreditCard,
  Target,
  ArrowDownRight,
  ArrowUpRight,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Check,
  Clock,
  Sparkles,
  Search,
  List,
  Grid,
  CalendarDays,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { formatCurrency } from "@/lib/utils";
import type {
  CalendarEvent,
  CalendarEventType,
  Category,
  Account,
  Profile,
} from "@/lib/types";
import { toast } from "sonner";
import Link from "next/link";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function FinancialCalendarPage() {
  const [mounted, setMounted] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  // Calendar Date State (defaults to current month/year)
  const [currentYear, setCurrentYear] = useState<number>(2026);
  const [currentMonth, setCurrentMonth] = useState<number>(10); // 1-12 (October)
  const [calendarView, setCalendarView] = useState<"month" | "week" | "agenda">("month");
  const [todayStr, setTodayStr] = useState<string>("2026-10-15");

  // Filters
  const [selectedEventType, setSelectedEventType] = useState<"all" | CalendarEventType>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  // Selected Event Dialog
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // Raw Events State
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  const loadData = () => {
    const prof = fyzaStore.getProfile();
    setProfile(prof);
    setCategories(fyzaStore.getCategories());
    setAccounts(fyzaStore.getAccounts());

    const evts = fyzaStore.getCalendarEvents({
      year: currentYear,
      month: currentMonth,
      eventTypes: selectedEventType === "all" ? undefined : [selectedEventType],
      categoryId: selectedCategory === "all" ? undefined : selectedCategory,
    });
    setEvents(evts);
  };

  useEffect(() => {
    setMounted(true);
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth() + 1);
    setTodayStr(now.toISOString().split("T")[0]);
  }, []);

  useEffect(() => {
    if (mounted) {
      loadData();
      const handleUpdate = () => loadData();
      window.addEventListener("fyza_store_updated", handleUpdate);
      return () => window.removeEventListener("fyza_store_updated", handleUpdate);
    }
  }, [mounted, currentYear, currentMonth, selectedEventType, selectedCategory]);

  // Calendar Navigation
  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth() + 1);
    setTodayStr(now.toISOString().split("T")[0]);
  };

  // Month Grid Calculation
  const calendarGrid = useMemo(() => {
    // Determine first day of month (1-indexed month)
    const firstDay = new Date(Date.UTC(currentYear, currentMonth - 1, 1));
    // Day of week: 0 is Sun, 1 is Mon... convert to Monday-first (0=Mon, 6=Sun)
    let startDayOfWeek = firstDay.getUTCDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const daysInMonth = new Date(Date.UTC(currentYear, currentMonth, 0)).getUTCDate();
    const daysInPrevMonth = new Date(Date.UTC(currentYear, currentMonth - 1, 0)).getUTCDate();

    const cells: Array<{
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
    }> = [];

    // Previous month filler days
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
      const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
      const dateStr = `${prevYear}-${String(prevMonth).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
      cells.push({
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
      });
    }

    // Next month filler days to complete 35 or 42 cells grid
    const totalCells = cells.length > 35 ? 42 : 35;
    const remaining = totalCells - cells.length;
    for (let d = 1; d <= remaining; d++) {
      const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
      const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;
      const dateStr = `${nextYear}-${String(nextMonth).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
      });
    }

    return cells;
  }, [currentYear, currentMonth, todayStr]);

  // Group events by date string
  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    events.forEach((evt) => {
      if (!map[evt.date]) map[evt.date] = [];
      map[evt.date].push(evt);
    });
    return map;
  }, [events]);

  // Monthly Financial Projections from Calendar
  const monthlyMetrics = useMemo(() => {
    let projectedIncome = 0;
    let projectedBills = 0;
    let completedSpending = 0;
    let goalDeadlinesCount = 0;

    events.forEach((evt) => {
      if (evt.type === "expected_income") {
        projectedIncome += evt.amount;
      } else if (evt.type === "subscription" || evt.type === "recurring_bill") {
        projectedBills += evt.amount;
      } else if (evt.type === "completed_transaction") {
        completedSpending += evt.amount;
      } else if (evt.type === "goal_deadline") {
        goalDeadlinesCount++;
      }
    });

    return {
      projectedIncome,
      projectedBills,
      completedSpending,
      goalDeadlinesCount,
      netProjected: projectedIncome - projectedBills,
    };
  }, [events]);

  // Handle Mark Paid directly from event details
  const handleMarkPaid = (evt: CalendarEvent) => {
    if (evt.sourceId && evt.sourceId.startsWith("rec-")) {
      const res = fyzaStore.recordRecurringPayment(evt.sourceId);
      if (res.success) {
        toast.success(`Marked ${evt.title} as paid (${formatCurrency(evt.amount)}).`);
        setSelectedEvent(null);
        loadData();
      } else {
        toast.error(res.error || "Could not record payment");
      }
    }
  };

  if (!mounted) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-4">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-sm text-muted-foreground">Initializing Financial Calendar...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Calendar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              Cash Flow Roadmap
            </span>
            <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
              Timezone: {profile?.timezone || "Asia/Kolkata"}
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
            <CalendarIcon className="h-7 w-7 text-primary" />
            Financial Calendar
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Inspect scheduled subscriptions, planned bills, expected income, and savings goal milestones in chronological context.
          </p>
        </div>

        {/* View Switcher & Action */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center rounded-xl border border-border bg-surface p-1 shadow-sm">
            <button
              onClick={() => setCalendarView("month")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                calendarView === "month"
                  ? "bg-primary text-black font-bold shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Month View
            </button>
            <button
              onClick={() => setCalendarView("agenda")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                calendarView === "agenda"
                  ? "bg-primary text-black font-bold shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Agenda List
            </button>
          </div>

          <Link href="/app/subscriptions">
            <Button
              variant="outline"
              size="sm"
              className="text-xs border-border text-foreground hover:bg-surface"
            >
              <CreditCard className="h-3.5 w-3.5 mr-1.5 text-secondary" />
              Manage Subscriptions
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Projection Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Card className="border-border bg-card/70 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
          <CardHeader className="pb-1">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Expected Inflows
              </p>
              <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                Planned
              </Badge>
            </div>
            <CardTitle className="text-xl sm:text-2xl font-extrabold text-emerald-400 mt-1 flex items-center gap-1.5">
              <ArrowDownRight className="h-5 w-5" />
              {formatCurrency(monthlyMetrics.projectedIncome)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] text-muted-foreground">
              Salary & planned recurring credits
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/70 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-secondary/10 rounded-full blur-2xl pointer-events-none" />
          <CardHeader className="pb-1">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Scheduled Outflows
              </p>
              <Badge variant="outline" className="text-[9px] bg-secondary/10 text-secondary border-secondary/20">
                Planned
              </Badge>
            </div>
            <CardTitle className="text-xl sm:text-2xl font-extrabold text-secondary mt-1 flex items-center gap-1.5">
              <ArrowUpRight className="h-5 w-5" />
              {formatCurrency(monthlyMetrics.projectedBills)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] text-muted-foreground">
              Subscriptions, bills & auto-debits
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/70 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
          <CardHeader className="pb-1">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Net Scheduled Cash Flow
            </p>
            <CardTitle className={`text-xl sm:text-2xl font-extrabold mt-1 ${
              monthlyMetrics.netProjected >= 0 ? "text-cyan-400" : "text-rose-400"
            }`}>
              {formatCurrency(monthlyMetrics.netProjected)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] text-muted-foreground">
              Projected balance delta for {MONTH_NAMES[currentMonth - 1]}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/70 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
          <CardHeader className="pb-1">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Goal Milestones
            </p>
            <CardTitle className="text-xl sm:text-2xl font-extrabold text-amber-400 mt-1 flex items-baseline gap-1.5">
              <span>{monthlyMetrics.goalDeadlinesCount}</span>
              <span className="text-xs font-normal text-muted-foreground">target dates</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] text-muted-foreground">
              Milestone deadlines occurring this month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Interactive Controls & Filters Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-2xl border border-border bg-surface/50">
        {/* Month Navigation */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrevMonth}
              className="h-8 w-8 rounded-lg border border-border bg-card flex items-center justify-center hover:bg-surface-elevated text-muted-foreground hover:text-foreground transition-colors"
              title="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={handleNextMonth}
              className="h-8 w-8 rounded-lg border border-border bg-card flex items-center justify-center hover:bg-surface-elevated text-muted-foreground hover:text-foreground transition-colors"
              title="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleToday}
            className="text-xs border-border h-8 font-semibold"
          >
            Today
          </Button>

          {/* Month & Year Jump Selectors */}
          <div className="flex items-center gap-2">
            <Select
              value={String(currentMonth)}
              onValueChange={(v) => setCurrentMonth(Number(v))}
            >
              <SelectTrigger className="w-36 h-8 text-xs bg-card border-border font-bold text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTH_NAMES.map((name, idx) => (
                  <SelectItem key={idx + 1} value={String(idx + 1)}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={String(currentYear)}
              onValueChange={(v) => setCurrentYear(Number(v))}
            >
              <SelectTrigger className="w-24 h-8 text-xs bg-card border-border font-bold text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2024, 2025, 2026, 2027, 2028].map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Event Type Filter */}
          <Select
            value={selectedEventType}
            onValueChange={(v) => setSelectedEventType(v as CalendarEventType | "all")}
          >
            <SelectTrigger className="w-44 h-8 text-xs bg-card border-border">
              <SelectValue placeholder="Event Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Calendar Events</SelectItem>
              <SelectItem value="subscription">Subscriptions Only</SelectItem>
              <SelectItem value="recurring_bill">Recurring Bills</SelectItem>
              <SelectItem value="expected_income">Expected Income</SelectItem>
              <SelectItem value="goal_deadline">Savings Goals</SelectItem>
              <SelectItem value="completed_transaction">Completed Transactions</SelectItem>
            </SelectContent>
          </Select>

          {/* Category Filter */}
          <Select
            value={selectedCategory}
            onValueChange={(v) => setSelectedCategory(v)}
          >
            <SelectTrigger className="w-36 h-8 text-xs bg-card border-border">
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
        </div>
      </div>

      {/* Semantic Color Legend */}
      <div className="flex flex-wrap items-center gap-4 px-2 text-[11px] text-muted-foreground">
        <span className="font-semibold uppercase tracking-wider text-muted-foreground/80">
          Legend:
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-secondary" />
          Violet = Subscriptions & Renewals
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          Emerald = Expected Income
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          Amber = Goal Deadlines
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-rose-400" />
          Coral/Red = Overdue Bills
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-cyan-400" />
          Cyan = Completed Transactions
        </span>
      </div>

      {/* CALENDAR VIEW 1: MONTH GRID */}
      {calendarView === "month" && (
        <Card className="border-border bg-card overflow-hidden shadow-sm">
          {/* Weekday Header */}
          <div className="grid grid-cols-7 border-b border-border bg-surface/70 text-center text-xs font-bold text-muted-foreground py-2.5">
            {WEEKDAYS.map((day) => (
              <div key={day} className="tracking-wider">
                {day}
              </div>
            ))}
          </div>

          {/* Day Cells Grid */}
          <div className="grid grid-cols-7 divide-x divide-y divide-border/60">
            {calendarGrid.map((cell, idx) => {
              const dayEvents = eventsByDate[cell.dateStr] || [];
              const isOverdueAny = dayEvents.some((e) => e.isOverdue);

              return (
                <div
                  key={idx}
                  className={`min-h-[110px] sm:min-h-[125px] p-1.5 sm:p-2 flex flex-col transition-colors ${
                    cell.isCurrentMonth
                      ? "bg-card hover:bg-surface/30"
                      : "bg-surface/30 opacity-40 hover:opacity-60"
                  } ${
                    cell.isToday
                      ? "ring-1 ring-inset ring-primary bg-primary/5"
                      : ""
                  }`}
                >
                  {/* Date Number Header */}
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-bold flex items-center justify-center h-6 w-6 rounded-full ${
                        cell.isToday
                          ? "bg-primary text-black font-extrabold shadow-sm"
                          : cell.isCurrentMonth
                          ? "text-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      {cell.dayNumber}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {dayEvents.length} evt{dayEvents.length > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>

                  {/* Day Events Pills */}
                  <div className="flex-1 space-y-1 overflow-hidden">
                    {dayEvents.slice(0, 3).map((evt) => {
                      const isSub = evt.type === "subscription" || evt.type === "recurring_bill";
                      const isInc = evt.type === "expected_income";
                      const isGoal = evt.type === "goal_deadline";
                      const isTx = evt.type === "completed_transaction";

                      let badgeColor = "bg-secondary/15 text-secondary border-secondary/30";
                      if (evt.isOverdue) badgeColor = "bg-rose-500/20 text-rose-300 border-rose-500/40";
                      else if (isInc) badgeColor = "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
                      else if (isGoal) badgeColor = "bg-amber-500/15 text-amber-300 border-amber-500/30";
                      else if (isTx) badgeColor = "bg-cyan-500/15 text-cyan-300 border-cyan-500/30";

                      return (
                        <button
                          key={evt.id}
                          onClick={() => setSelectedEvent(evt)}
                          className={`w-full text-left px-1.5 py-0.5 rounded-md border text-[10px] font-semibold truncate flex items-center justify-between gap-1 transition-transform hover:scale-[1.02] shadow-sm ${badgeColor}`}
                          title={`${evt.title} (${formatCurrency(evt.amount)})`}
                        >
                          <span className="truncate">{evt.title}</span>
                          <span className="shrink-0 font-mono text-[9px] opacity-90">
                            {formatCurrency(evt.amount)}
                          </span>
                        </button>
                      );
                    })}

                    {dayEvents.length > 3 && (
                      <button
                        onClick={() => {
                          setSelectedEvent(dayEvents[3]);
                        }}
                        className="text-[10px] font-semibold text-primary hover:underline pl-1 block text-left"
                      >
                        +{dayEvents.length - 3} more
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* CALENDAR VIEW 2: AGENDA LIST */}
      {calendarView === "agenda" && (
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base font-bold text-foreground">
              Chronological Financial Agenda — {MONTH_NAMES[currentMonth - 1]} {currentYear}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              A chronological timeline of planned renewals, expected deposits, and ledger transactions.
            </p>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <p className="font-semibold text-foreground">No events scheduled for this month</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Try switching months or removing event-type filters.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {events.map((evt) => {
                  const isInc = evt.type === "expected_income";
                  const isGoal = evt.type === "goal_deadline";
                  const isTx = evt.type === "completed_transaction";

                  return (
                    <div
                      key={evt.id}
                      className="p-3.5 rounded-xl border border-border bg-surface/40 hover:border-primary/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-start sm:items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-card border border-border flex flex-col items-center justify-center shrink-0">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold">
                            {new Date(evt.date + "T00:00:00").toLocaleDateString("en-US", { month: "short" })}
                          </span>
                          <span className="text-sm font-extrabold text-foreground leading-none">
                            {new Date(evt.date + "T00:00:00").getDate()}
                          </span>
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-sm text-foreground">{evt.title}</p>
                            <Badge
                              variant="outline"
                              className={`text-[9px] font-bold capitalize ${
                                evt.isOverdue
                                  ? "bg-rose-500/15 text-rose-400 border-rose-500/30"
                                  : isInc
                                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                                  : isGoal
                                  ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                                  : isTx
                                  ? "bg-cyan-500/15 text-cyan-400 border-cyan-500/30"
                                  : "bg-secondary/15 text-secondary border-secondary/30"
                              }`}
                            >
                              {evt.isOverdue ? "Overdue" : evt.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {evt.category?.name || "General"} • {evt.account?.name || "Default Account"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-0 border-border">
                        <span className={`text-base font-extrabold ${
                          isInc ? "text-emerald-400" : "text-foreground"
                        }`}>
                          {isInc ? "+" : "-"}{formatCurrency(evt.amount)}
                        </span>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedEvent(evt)}
                          className="text-xs h-8 border-border"
                        >
                          Details
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ACCESSIBLE EVENT DETAILS MODAL */}
      <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        {selectedEvent && (
          <DialogContent className="sm:max-w-md bg-card border-border">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="text-lg font-bold text-foreground">
                  {selectedEvent.title}
                </DialogTitle>
                <Badge
                  variant="outline"
                  className={`text-[10px] font-bold capitalize ${
                    selectedEvent.isOverdue
                      ? "bg-rose-500/15 text-rose-400 border-rose-500/30"
                      : selectedEvent.type === "expected_income"
                      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                      : "bg-secondary/15 text-secondary border-secondary/30"
                  }`}
                >
                  {selectedEvent.isOverdue ? "Overdue" : selectedEvent.status}
                </Badge>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              <div className="p-3 rounded-xl bg-surface/50 border border-border flex items-baseline justify-between">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Event Date</span>
                  <span className="text-sm font-bold text-foreground">{selectedEvent.date}</span>
                </div>
                <div className="text-right">
                  <span className="text-muted-foreground block text-[11px]">Scheduled Amount</span>
                  <span className="text-lg font-extrabold text-foreground">
                    {formatCurrency(selectedEvent.amount)}
                  </span>
                </div>
              </div>

              {selectedEvent.type === "expected_income" && (
                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] flex items-start gap-2">
                  <Info className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>
                    Planned income estimation: This amount is scheduled for planning and is NOT counted as guaranteed money until recorded as settled.
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-muted-foreground block">Event Classification</span>
                  <span className="font-semibold text-foreground capitalize">
                    {selectedEvent.type.replace("_", " ")}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Category</span>
                  <span className="font-semibold text-foreground">
                    {selectedEvent.category?.name || "General"}
                  </span>
                </div>
                {selectedEvent.merchant && (
                  <div>
                    <span className="text-muted-foreground block">Merchant / Payee</span>
                    <span className="font-semibold text-foreground">{selectedEvent.merchant}</span>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground block">Account</span>
                  <span className="font-semibold text-foreground">
                    {selectedEvent.account?.name || "Primary Account"}
                  </span>
                </div>
              </div>

              {selectedEvent.notes && (
                <div className="p-2.5 rounded-lg bg-surface border border-border">
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold mb-1">
                    Details & Notes
                  </span>
                  <p className="text-foreground leading-relaxed">{selectedEvent.notes}</p>
                </div>
              )}

              {selectedEvent.cancellation_url && (
                <div className="p-2.5 rounded-lg bg-secondary/10 border border-secondary/20 flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">Provider Portal:</span>
                  <a
                    href={selectedEvent.cancellation_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-secondary hover:underline text-xs font-semibold"
                  >
                    Open Provider Site <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </div>

            <DialogFooter className="pt-2 flex items-center justify-between w-full">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedEvent(null)}
                className="text-xs border-border"
              >
                Close
              </Button>

              <div className="flex items-center gap-2">
                {selectedEvent.sourceId?.startsWith("rec-") && selectedEvent.status !== "completed" && (
                  <Button
                    size="sm"
                    onClick={() => handleMarkPaid(selectedEvent)}
                    className="bg-primary text-black font-semibold text-xs"
                  >
                    <Check className="h-3.5 w-3.5 mr-1" />
                    Mark as Paid
                  </Button>
                )}
              </div>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
