"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Shield,
  TrendingUp,
  PieChart,
  Target,
  Bot,
  Lock,
  CheckCircle2,
  ChevronDown,
  Sparkles,
  Wallet,
  CreditCard,
  Play,
  Menu,
  X,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/providers/auth-provider";
import { ThemeSelector } from "@/components/layout/theme-selector";

// AI Simulation Scenarios for Interactive Preview
const AI_DEMO_SCENARIOS = [
  {
    id: "safe-spend",
    question: "How much can I safely spend this weekend?",
    badge: "Discretionary Flow",
    answer:
      "Based on your current checking balance of ₹3,42,800, upcoming rent of ₹32,000, and remaining dining budget of ₹8,400, your safe discretionary limit for this weekend is ₹14,250 without impacting your monthly emergency fund contribution.",
    metrics: [
      { label: "Safe to Spend", value: "₹14,250", color: "text-emerald-400" },
      { label: "Committed Bills", value: "₹35,200", color: "text-amber-400" },
      { label: "Target Savings", value: "₹45,000", color: "text-primary" },
    ],
  },
  {
    id: "subscriptions",
    question: "What subscriptions are renewing soon?",
    badge: "Renewal Audit",
    answer:
      "You have 3 recurring subscriptions due in the next 10 days: Netflix 4K (₹649 on Oct 18), Spotify Duo (₹149 on Oct 22), and GitHub Copilot (₹830 on Oct 25). Total outflow: ₹1,628. All scheduled to auto-debit from ICICI Credit Card.",
    metrics: [
      { label: "Due Next 10d", value: "₹1,628", color: "text-cyan-400" },
      { label: "Active Services", value: "7 Subscriptions", color: "text-foreground" },
      { label: "Overlaps Found", value: "0 Detected", color: "text-emerald-400" },
    ],
  },
  {
    id: "vacation-afford",
    question: "Can I afford a ₹60,000 trip in December?",
    badge: "Pacing Simulation",
    answer:
      "Yes! Your average monthly savings rate is 61.4% (₹1,06,151 surplus/mo). Allocating ₹20,000 across October, November, and December easily funds the ₹60,000 trip while leaving ₹86,151/month for your emergency safety net.",
    metrics: [
      { label: "Projected Surplus", value: "+₹3,18,450", color: "text-emerald-400" },
      { label: "Trip Cost", value: "₹60,000", color: "text-rose-400" },
      { label: "Feasibility Score", value: "98% (High)", color: "text-primary" },
    ],
  },
  {
    id: "dining-creep",
    question: "Where did my dining budget go this month?",
    badge: "Category Drift",
    answer:
      "You have spent ₹11,600 across 8 transactions (77.3% of your ₹15,000 limit). Weekend takeout via Swiggy/Zomato accounts for 68% of this total. You are pacing slightly ahead of target, with ₹3,400 remaining for the final 17 days.",
    metrics: [
      { label: "Spent So Far", value: "₹11,600", color: "text-amber-400" },
      { label: "Remaining", value: "₹3,400", color: "text-emerald-400" },
      { label: "Avg / Weekend", value: "₹2,450", color: "text-muted-foreground" },
    ],
  },
];

export default function LandingPage() {
  const router = useRouter();
  const { startDemoSession } = useAuth();
  const prefersReducedMotion = useReducedMotion();

  // State
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [activePreviewTab, setActivePreviewTab] = useState<"overview" | "ai" | "budgets" | "goals">("overview");
  const [activeAiScenario, setActiveAiScenario] = useState(0);

  // Interactive budget slider state
  const [budgetLimit, setBudgetLimit] = useState(15000);
  const diningSpent = 11600;

  // Compound wealth simulator state
  const [monthlyContribution, setMonthlyContribution] = useState(25000);
  const [years, setYears] = useState(10);
  const [expectedReturnRate, setExpectedReturnRate] = useState(12);

  const handleExploreDashboard = () => {
    startDemoSession();
    router.push("/demo");
  };

  // Compound interest calculation
  const simulatorResults = useMemo(() => {
    const P = monthlyContribution;
    const r = expectedReturnRate / 100 / 12; // monthly interest rate
    const n = years * 12; // total compounding periods in months

    const futureValue = Math.round(P * (((Math.pow(1 + r, n) - 1) / r) * (1 + r)));
    const totalInvested = P * n;
    const wealthGained = futureValue - totalInvested;
    const multiplier = (futureValue / (totalInvested || 1)).toFixed(1);

    return {
      futureValue,
      totalInvested,
      wealthGained,
      multiplier,
    };
  }, [monthlyContribution, years, expectedReturnRate]);

  // Motion variants with reduced motion fallback
  const fadeInUp = {
    hidden: { opacity: 0, y: prefersReducedMotion ? 0 : 24 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
    },
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: prefersReducedMotion ? 0 : 0.12,
        delayChildren: 0.1,
      },
    },
  };

  const FAQS = [
    {
      q: "What makes Fyza different from other expense trackers?",
      a: "Fyza is built with precision fintech craftsmanship. We calculate all transactions in integer minor units (zero floating-point math errors), provide transparent, explainable financial health scores, support realistic multi-scenario cash flow forecasting, and feature Fyza AI — a context-aware assistant that analyzes your exact financial records without fabricating arithmetic.",
    },
    {
      q: "Is my financial data secure?",
      a: "Absolutely. Fyza employs strict Supabase Row Level Security (RLS) policies where only your authenticated account can ever read or write your data. We never ask for bank login credentials, OTPs, or credit card CVVs. Data is encrypted in transit via TLS 1.3 and at rest with AES-256.",
    },
    {
      q: "Can I test Fyza before connecting or creating an account?",
      a: "Yes! Click 'Explore Interactive Demo' anywhere on this page to immediately launch an interactive live demo session with pre-populated, realistic financial records. You can create transactions, adjust budgets, test forecasts, and talk to Fyza AI without entering a password.",
    },
    {
      q: "Does Fyza support multiple currencies?",
      a: "Fyza defaults to Indian Rupees (INR ₹) and provides seamless settings for USD ($), EUR (€), GBP (£), JPY (¥), AED (د.إ), and more. Multi-currency balances are kept distinct to prevent misleading conversions.",
    },
    {
      q: "How does Fyza AI work?",
      a: "Fyza AI processes your computed financial summaries securely on server-side endpoints. It never hallucinates numbers because the application calculates all balances, category totals, and budget variances in deterministic application logic before providing context to the AI.",
    },
    {
      q: "Can I export my data if I want to leave?",
      a: "Yes. Fyza supports 1-click full CSV and JSON data exports from both the Transactions and Financial Reports modules. Your financial records belong solely to you.",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-black relative overflow-x-hidden">
      {/* Background Subtle Animated Glow Accents */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-primary/10 blur-[150px] rounded-full" />
        <div className="absolute top-[28%] right-[-100px] w-[600px] h-[500px] bg-secondary/15 blur-[160px] rounded-full" />
        <div className="absolute top-[60%] left-[-100px] w-[600px] h-[500px] bg-cyan-500/10 blur-[150px] rounded-full" />
        <div className="absolute bottom-10 right-1/4 w-[700px] h-[400px] bg-amber-500/10 blur-[160px] rounded-full" />
      </div>

      {/* 1. RESPONSIVE NAVIGATION */}
      <header className="sticky top-0 z-50 border-b border-border/80 bg-background/80 backdrop-blur-xl transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center gap-3 shrink-0 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">
              <span className="font-extrabold text-black text-xl">F</span>
            </div>
            <span className="font-extrabold text-xl tracking-tight text-foreground flex items-center gap-2">
              Fyza
              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/25">
                Fintech
              </span>
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <a href="#features" className="hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">
              How It Works
            </a>
            <a href="#preview" className="hover:text-foreground transition-colors">
              Live Preview
            </a>
            <a href="#simulator" className="hover:text-foreground transition-colors">
              Simulator
            </a>
            <a href="#security" className="hover:text-foreground transition-colors">
              Security
            </a>
            <a href="#faq" className="hover:text-foreground transition-colors">
              FAQ
            </a>
          </nav>

          {/* Right Header CTAs */}
          <div className="hidden sm:flex items-center gap-3">
            <ThemeSelector />

            <Link href="/demo">
              <Button variant="ghost" size="sm" className="font-semibold text-xs text-primary hover:bg-primary/10">
                <Play className="h-3 w-3 mr-1 fill-current" />
                Live Demo
              </Button>
            </Link>

            <Link href="/login">
              <Button variant="ghost" size="sm" className="font-medium text-xs">
                Sign In
              </Button>
            </Link>

            <Link href="/signup">
              <Button
                size="sm"
                className="bg-primary text-black font-bold hover:bg-primary/90 shadow-md shadow-primary/20 text-xs px-4"
              >
                Get Started
              </Button>
            </Link>
          </div>

          {/* Mobile Hamburger Button */}
          <div className="flex items-center gap-2 sm:hidden">
            <ThemeSelector />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg border border-border bg-surface text-foreground"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="sm:hidden border-b border-border bg-background/95 backdrop-blur-xl px-4 py-5 space-y-3"
            >
              <div className="flex flex-col space-y-2 text-sm font-medium">
                <a
                  href="#features"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2 px-3 rounded-lg hover:bg-surface text-muted-foreground hover:text-foreground transition-colors"
                >
                  Features
                </a>
                <a
                  href="#how-it-works"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2 px-3 rounded-lg hover:bg-surface text-muted-foreground hover:text-foreground transition-colors"
                >
                  How It Works
                </a>
                <a
                  href="#preview"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2 px-3 rounded-lg hover:bg-surface text-muted-foreground hover:text-foreground transition-colors"
                >
                  Live Preview
                </a>
                <a
                  href="#simulator"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2 px-3 rounded-lg hover:bg-surface text-muted-foreground hover:text-foreground transition-colors"
                >
                  Wealth Simulator
                </a>
                <a
                  href="#security"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2 px-3 rounded-lg hover:bg-surface text-muted-foreground hover:text-foreground transition-colors"
                >
                  Security
                </a>
                <a
                  href="#faq"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2 px-3 rounded-lg hover:bg-surface text-muted-foreground hover:text-foreground transition-colors"
                >
                  FAQ
                </a>
              </div>

              <div className="pt-3 border-t border-border flex flex-col gap-2">
                <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" className="w-full text-xs font-semibold">
                    Sign In
                  </Button>
                </Link>
                <Link href="/signup" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full bg-primary text-black text-xs font-bold">
                    Get Started Free
                  </Button>
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* 2 & 3. HERO SECTION */}
      <section className="pt-20 pb-16 sm:pt-28 sm:pb-24 px-4 sm:px-6 max-w-7xl mx-auto text-center relative">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="max-w-4xl mx-auto"
        >
          {/* Eyebrow Badge */}
          <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-border/80 bg-surface/80 text-foreground text-xs font-medium mb-8 backdrop-blur-sm shadow-sm">
            <span className="h-2 w-2 rounded-full bg-primary" />
            <span className="text-muted-foreground">Modern Personal Finance & Cash Flow Intelligence</span>
          </motion.div>

          {/* EXACT HERO HEADLINE */}
          <motion.h1
            variants={fadeInUp}
            className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6 text-foreground"
          >
            Your money. <br className="hidden sm:inline" />
            <span className="gradient-text">Your clarity.</span>
          </motion.h1>

          {/* SUPPORTING COPY */}
          <motion.p
            variants={fadeInUp}
            className="text-base sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed font-normal"
          >
            Master cash flow, plan dynamic budgets, track goal progress, and forecast your financial future with integer-accurate analytics and an intelligent financial assistant.
          </motion.p>

          {/* 4 & 5. PRIMARY & SECONDARY CTAS */}
          <motion.div
            variants={fadeInUp}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto mb-16"
          >
            <Link href="/signup" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto bg-primary text-black font-bold text-base px-8 h-12 hover:bg-primary/90 shadow-lg shadow-primary/25 flex items-center justify-center gap-2 group"
              >
                <span>Get Started Free</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>

            <Button
              variant="outline"
              size="lg"
              onClick={handleExploreDashboard}
              className="w-full sm:w-auto border-border bg-surface text-foreground font-semibold text-base h-12 hover:bg-surface-elevated flex items-center justify-center gap-2"
            >
              <Play className="h-4 w-4 fill-current text-primary" />
              <span>Explore Interactive Demo</span>
            </Button>
          </motion.div>

          {/* Subtle Floating Badges */}
          <motion.div
            variants={fadeInUp}
            className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto mb-12"
          >
            <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 backdrop-blur-md flex items-center gap-2.5 text-left animate-float-gentle">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-bold text-emerald-400">Monthly Surplus</p>
                <p className="text-xs sm:text-sm font-extrabold text-foreground truncate">+₹1,06,151.00</p>
              </div>
            </div>

            <div className="p-3 rounded-xl border border-secondary/30 bg-secondary/10 backdrop-blur-md flex items-center gap-2.5 text-left">
              <Bot className="h-4 w-4 text-secondary shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-bold text-secondary">Smart Assistant</p>
                <p className="text-xs sm:text-sm font-extrabold text-foreground truncate">Insights & Advice</p>
              </div>
            </div>

            <div className="p-3 rounded-xl border border-cyan-500/30 bg-cyan-500/10 backdrop-blur-md flex items-center gap-2.5 text-left">
              <Shield className="h-4 w-4 text-cyan-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-bold text-cyan-400">Financial Health</p>
                <p className="text-xs sm:text-sm font-extrabold text-foreground truncate">88 / 100 (Peak Tier)</p>
              </div>
            </div>

            <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 backdrop-blur-md flex items-center gap-2.5 text-left">
              <Target className="h-4 w-4 text-amber-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-bold text-amber-400">Safety Net Goal</p>
                <p className="text-xs sm:text-sm font-extrabold text-foreground truncate">74% Target Achieved</p>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* 6. ANIMATED FINANCIAL DASHBOARD PREVIEW */}
        <motion.div
          id="preview"
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto max-w-5xl rounded-3xl border border-border/80 bg-surface/90 shadow-2xl overflow-hidden p-2 sm:p-5 backdrop-blur-xl scroll-mt-24"
        >
          {/* Demo Data Label Banner */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border/60 text-xs">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-bold text-primary tracking-wide uppercase text-[11px]">
                Demo Ledger Preview • Realistic Financial Data
              </span>
            </div>
            <div className="flex items-center gap-1.5 p-1 rounded-lg bg-background border border-border">
              <button
                onClick={() => setActivePreviewTab("overview")}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                  activePreviewTab === "overview" ? "bg-primary text-black" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Cash Flow
              </button>
              <button
                onClick={() => setActivePreviewTab("ai")}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                  activePreviewTab === "ai" ? "bg-secondary text-white" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Assistant
              </button>
              <button
                onClick={() => setActivePreviewTab("budgets")}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                  activePreviewTab === "budgets" ? "bg-primary text-black" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Budgets
              </button>
              <button
                onClick={() => setActivePreviewTab("goals")}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                  activePreviewTab === "goals" ? "bg-amber-500 text-black" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Goals
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-background/95 p-4 sm:p-6 text-left mt-2">
            {/* Mock Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-border/60 gap-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Good evening, Alex</p>
                <h3 className="text-xl font-bold text-foreground">Financial Overview & Trajectory</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Health Score: 88/100 (Peak Tier)
                </span>
              </div>
            </div>

            {/* Mock Metrics Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-6">
              <div className="p-4 rounded-xl bg-surface border border-border/60">
                <p className="text-xs font-medium text-muted-foreground">Total Net Balance</p>
                <p className="text-2xl font-bold text-foreground mt-1">₹5,11,550.00</p>
                <p className="text-[11px] text-emerald-400 mt-1 font-medium">Across 4 Tracked Accounts</p>
              </div>
              <div className="p-4 rounded-xl bg-surface border border-border/60">
                <p className="text-xs font-medium text-muted-foreground">Month Income</p>
                <p className="text-2xl font-bold text-emerald-400 mt-1">₹1,73,000.00</p>
                <p className="text-[11px] text-muted-foreground mt-1">+19.3% vs last month</p>
              </div>
              <div className="p-4 rounded-xl bg-surface border border-border/60">
                <p className="text-xs font-medium text-muted-foreground">Month Expenses</p>
                <p className="text-2xl font-bold text-rose-400 mt-1">₹66,849.00</p>
                <p className="text-[11px] text-emerald-400 mt-1">Well within ₹85,000 ceiling</p>
              </div>
              <div className="p-4 rounded-xl bg-surface border border-border/60">
                <p className="text-xs font-medium text-muted-foreground">Savings Rate</p>
                <p className="text-2xl font-bold text-cyan-400 mt-1">61.4%</p>
                <p className="text-[11px] text-muted-foreground mt-1">Net flow: +₹1,06,151.00</p>
              </div>
            </div>

            {/* TAB VIEW: OVERVIEW CASH FLOW */}
            {activePreviewTab === "overview" && (
              <div className="space-y-4 animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Cash Flow Trajectory Bars */}
                  <div className="p-4 rounded-xl bg-surface/50 border border-border/40 md:col-span-2">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-foreground">Cash Flow Trajectory (Daily Inflow vs Outflow)</span>
                      <span className="text-xs text-muted-foreground">October 2026</span>
                    </div>
                    <div className="h-32 flex items-end gap-2 pt-4">
                      {[
                        { inc: 80, exp: 30, day: "01" },
                        { inc: 45, exp: 20, day: "04" },
                        { inc: 60, exp: 35, day: "07" },
                        { inc: 40, exp: 15, day: "10" },
                        { inc: 90, exp: 40, day: "13" },
                        { inc: 70, exp: 25, day: "16" },
                        { inc: 85, exp: 50, day: "19" },
                        { inc: 55, exp: 20, day: "22" },
                        { inc: 95, exp: 35, day: "25" },
                        { inc: 75, exp: 30, day: "28" },
                        { inc: 100, exp: 45, day: "31" },
                      ].map((item, idx) => (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                          <div className="w-full flex items-end gap-1 h-24">
                            <div
                              className="flex-1 rounded-t bg-gradient-to-t from-emerald-500/40 to-emerald-400 group-hover:brightness-125 transition-all"
                              style={{ height: `${item.inc}%` }}
                              title={`Inflow: Day ${item.day}`}
                            />
                            <div
                              className="flex-1 rounded-t bg-gradient-to-t from-rose-500/40 to-rose-400 group-hover:brightness-125 transition-all"
                              style={{ height: `${item.exp}%` }}
                              title={`Outflow: Day ${item.day}`}
                            />
                          </div>
                          <span className="text-[9px] text-muted-foreground font-mono">{item.day}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* AI Insight Card */}
                  <div className="p-4 rounded-xl bg-surface/50 border border-border/40 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Bot className="h-4 w-4 text-primary" />
                        <span className="text-xs font-semibold text-foreground">Financial Health Insight</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        &quot;Your dining and shopping expenses are trending 14% lower than last month, leaving you with ₹38,400 surplus to deploy toward your Emergency Fund.&quot;
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleExploreDashboard}
                      className="w-full text-xs font-semibold border-primary/30 text-primary hover:bg-primary/10 mt-3"
                    >
                      Test Assistant Now
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB VIEW: ASSISTANT PREVIEW */}
            {activePreviewTab === "ai" && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex flex-wrap gap-2 mb-3">
                  {AI_DEMO_SCENARIOS.map((scenario, idx) => (
                    <button
                      key={scenario.id}
                      onClick={() => setActiveAiScenario(idx)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border flex items-center gap-1.5 ${
                        activeAiScenario === idx
                          ? "bg-secondary/20 text-white border-secondary/50 shadow-sm"
                          : "bg-surface border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Sparkles className="h-3 w-3 text-secondary" />
                      <span>{scenario.question}</span>
                    </button>
                  ))}
                </div>

                <div className="p-4 rounded-xl border border-secondary/30 bg-secondary/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-foreground flex items-center gap-2">
                      <Bot className="h-4 w-4 text-secondary" />
                      Assistant Analysis & Insights
                    </span>
                    <Badge variant="outline" className="text-[10px] bg-secondary/20 text-white border-secondary/30">
                      {AI_DEMO_SCENARIOS[activeAiScenario].badge}
                    </Badge>
                  </div>
                  <p className="text-xs sm:text-sm text-foreground leading-relaxed mb-4">
                    &quot;{AI_DEMO_SCENARIOS[activeAiScenario].answer}&quot;
                  </p>
                  <div className="grid grid-cols-3 gap-2 pt-3 border-t border-secondary/20">
                    {AI_DEMO_SCENARIOS[activeAiScenario].metrics.map((m, idx) => (
                      <div key={idx} className="p-2 rounded-lg bg-surface/60 border border-border/40">
                        <p className="text-[9px] uppercase font-bold text-muted-foreground">{m.label}</p>
                        <p className={`text-xs sm:text-sm font-extrabold mt-0.5 ${m.color}`}>{m.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB VIEW: SMART BUDGETS PREVIEW */}
            {activePreviewTab === "budgets" && (
              <div className="space-y-4 animate-fade-in">
                <div className="p-4 rounded-xl bg-surface border border-border">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-semibold text-foreground">Interactive Dining Budget Limit</span>
                    <span className="font-mono font-bold text-primary">₹{budgetLimit.toLocaleString()}</span>
                  </div>
                  <input
                    type="range"
                    min="10000"
                    max="25000"
                    step="1000"
                    value={budgetLimit}
                    onChange={(e) => setBudgetLimit(Number(e.target.value))}
                    className="w-full accent-primary cursor-pointer"
                  />
                </div>

                <div className="space-y-3">
                  {(() => {
                    const pct = Math.min(100, Math.round((diningSpent / budgetLimit) * 100));
                    const isExceeded = diningSpent > budgetLimit;
                    const isWarning = pct >= 75 && !isExceeded;
                    return (
                      <div className="p-3 rounded-xl bg-surface/60 border border-border space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-foreground">Food & Dining</span>
                          <span className="font-mono text-xs">
                            ₹{diningSpent.toLocaleString()} / ₹{budgetLimit.toLocaleString()}{" "}
                            <span className={isExceeded ? "text-rose-400 font-bold" : isWarning ? "text-amber-400 font-bold" : "text-emerald-400 font-bold"}>
                              ({pct}%)
                            </span>
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-border overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              isExceeded ? "bg-rose-500" : isWarning ? "bg-amber-400" : "bg-emerald-400"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })()}

                  <div className="p-3 rounded-xl bg-surface/60 border border-border space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-foreground">Shopping & Tech</span>
                      <span className="font-mono text-xs">₹6,200 / ₹12,000 <span className="text-emerald-400 font-bold">(51.6%)</span></span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-border overflow-hidden">
                      <div className="h-full bg-emerald-400" style={{ width: "51.6%" }} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB VIEW: SAVINGS GOALS PREVIEW */}
            {activePreviewTab === "goals" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">
                <div className="p-4 rounded-xl bg-surface border border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">Emergency Safety Net</span>
                    <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                      74% Complete
                    </Badge>
                  </div>
                  <p className="text-lg font-bold text-foreground">₹1,85,000 <span className="text-xs font-normal text-muted-foreground">/ ₹2,50,000</span></p>
                  <div className="h-2 w-full rounded-full bg-border overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: "74%" }} />
                  </div>
                  <p className="text-[11px] text-emerald-400">Pacing: On track to complete in 2 months</p>
                </div>

                <div className="p-4 rounded-xl bg-surface border border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">Japan Spring Vacation</span>
                    <Badge variant="outline" className="text-[10px] bg-cyan-500/10 text-cyan-400 border-cyan-500/20">
                      52.8% Complete
                    </Badge>
                  </div>
                  <p className="text-lg font-bold text-foreground">₹95,000 <span className="text-xs font-normal text-muted-foreground">/ ₹1,80,000</span></p>
                  <div className="h-2 w-full rounded-full bg-border overflow-hidden">
                    <div className="h-full bg-cyan-400" style={{ width: "52.8%" }} />
                  </div>
                  <p className="text-[11px] text-muted-foreground">Target Date: April 2027</p>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </section>

      {/* 7. FEATURES SECTION */}
      <section id="features" className="py-20 bg-surface/30 border-y border-border/60 px-4 sm:px-6 scroll-mt-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs font-bold uppercase tracking-wider text-primary mb-3">
              Comprehensive Financial Engine
            </h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-foreground">
              Everything required to manage wealth with confidence.
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature 1: Expense Tracking */}
            <div className="p-6 rounded-2xl border border-border bg-card hover:border-primary/40 transition-all group">
              <div className="h-12 w-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Wallet className="h-6 w-6" />
              </div>
              <h4 className="text-lg font-bold text-foreground mb-2">Integer Expense Tracking</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                All transactions computed in integer minor units (paise/cents). Track checking, savings, credit, and cash wallets with atomic transfer isolation.
              </p>
            </div>

            {/* Feature 2: Smart Budgeting */}
            <div className="p-6 rounded-2xl border border-border bg-card hover:border-primary/40 transition-all group">
              <div className="h-12 w-12 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <PieChart className="h-6 w-6" />
              </div>
              <h4 className="text-lg font-bold text-foreground mb-2">Zero-Based Budget Planning</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Set monthly category allocations. Receive respectful, non-shaming threshold warnings at 50%, 75%, 90%, and 100% capacity before you overspend.
              </p>
            </div>

            {/* Feature 3: Savings Goals */}
            <div className="p-6 rounded-2xl border border-border bg-card hover:border-primary/40 transition-all group">
              <div className="h-12 w-12 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Target className="h-6 w-6" />
              </div>
              <h4 className="text-lg font-bold text-foreground mb-2">Automated Savings Goals</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Track emergency funds, vehicle purchases, and dream trips. Automated monthly pacing calculators show exactly how much to save to hit target dates.
              </p>
            </div>

            {/* Feature 4: Financial Assistant */}
            <div className="p-6 rounded-2xl border border-border bg-card hover:border-primary/40 transition-all group">
              <div className="h-12 w-12 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Bot className="h-6 w-6" />
              </div>
              <h4 className="text-lg font-bold text-foreground mb-2">Context-Aware Financial Assistant</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Ask natural questions about spending trends, recurring bills, and budget gaps. Server-authenticated and grounded in exact database math without hallucination.
              </p>
            </div>

            {/* Feature 5: Subscriptions & Recurring Bills */}
            <div className="p-6 rounded-2xl border border-border bg-card hover:border-primary/40 transition-all group">
              <div className="h-12 w-12 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <CreditCard className="h-6 w-6" />
              </div>
              <h4 className="text-lg font-bold text-foreground mb-2">Subscription & Bill Guard</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Detect duplicate streaming subscriptions, view upcoming 30-day renewal countdowns, and audit your total annual recurring outflow in one dashboard.
              </p>
            </div>

            {/* Feature 6: Forecasting */}
            <div className="p-6 rounded-2xl border border-border bg-card hover:border-primary/40 transition-all group">
              <div className="h-12 w-12 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <TrendingUp className="h-6 w-6" />
              </div>
              <h4 className="text-lg font-bold text-foreground mb-2">Multi-Scenario Forecasting</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Simulate conservative, expected, and optimistic trajectories with user-adjustable inflation, savings boosts, and expected salary increments.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 8. HOW IT WORKS SECTION */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 max-w-7xl mx-auto scroll-mt-20">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <Badge variant="outline" className="mb-3 text-[11px] font-bold uppercase tracking-wider text-primary border-primary/30 bg-primary/10">
            Simple 3-Step Process
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
            How Fyza transforms your financial trajectory.
          </h2>
          <p className="text-sm text-muted-foreground mt-3">
            Designed for busy professionals who want clarity without tedious manual bookkeeping.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-8 rounded-3xl border border-border bg-card/60 backdrop-blur-sm relative overflow-hidden flex flex-col justify-between">
            <div>
              <span className="text-4xl font-extrabold text-primary/30 mb-4 block font-mono">
                01
              </span>
              <h4 className="text-xl font-bold text-foreground mb-3">Track Accounts & Ledger</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Log transactions via quick-add or 1-click bank CSV import. Everything is stored in integer minor units (paise/cents) to eliminate rounding errors.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-border/60 text-xs font-semibold text-primary">
              ✓ Multi-Account Sync
            </div>
          </div>

          <div className="p-8 rounded-3xl border border-border bg-card/60 backdrop-blur-sm relative overflow-hidden flex flex-col justify-between">
            <div>
              <span className="text-4xl font-extrabold text-secondary/30 mb-4 block font-mono">
                02
              </span>
              <h4 className="text-xl font-bold text-foreground mb-3">Set Smart Category Budgets</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Establish zero-based monthly allocations. Get timely notifications at 50%, 75%, 90%, and 100% before budget creep impacts your savings.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-border/60 text-xs font-semibold text-secondary">
              ✓ Non-Shaming Thresholds
            </div>
          </div>

          <div className="p-8 rounded-3xl border border-border bg-card/60 backdrop-blur-sm relative overflow-hidden flex flex-col justify-between">
            <div>
              <span className="text-4xl font-extrabold text-cyan-400/30 mb-4 block font-mono">
                03
              </span>
              <h4 className="text-xl font-bold text-foreground mb-3">Forecast & Grow Wealth</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Converse with your assistant to test purchase affordability, simulate compound wealth returns, and hit milestone savings goals on schedule.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-border/60 text-xs font-semibold text-cyan-400">
              ✓ Accurate Guidance
            </div>
          </div>
        </div>
      </section>

      {/* COMPOUND WEALTH SIMULATOR SECTION */}
      <section id="simulator" className="py-20 px-4 sm:px-6 max-w-7xl mx-auto scroll-mt-20">
        <div className="rounded-3xl border border-primary/20 bg-gradient-to-b from-card to-surface p-6 sm:p-12 relative overflow-hidden backdrop-blur-xl">
          <div className="max-w-2xl mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-3">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>Interactive Compound Wealth Simulator</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground">
              See what consistent monthly discipline builds.
            </h2>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              Drag the sliders below to project future portfolio accumulation based on compound interest. All projections update in real time.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Sliders Column */}
            <div className="lg:col-span-7 space-y-6">
              <div className="p-4 rounded-2xl bg-surface/80 border border-border">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-bold text-foreground">Monthly Investment / SIP</span>
                  <span className="font-mono font-extrabold text-primary text-sm">
                    ₹{monthlyContribution.toLocaleString()}
                  </span>
                </div>
                <input
                  type="range"
                  min="2000"
                  max="150000"
                  step="1000"
                  value={monthlyContribution}
                  onChange={(e) => setMonthlyContribution(Number(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                  <span>₹2,000/mo</span>
                  <span>₹75,000/mo</span>
                  <span>₹1,50,000/mo</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-surface/80 border border-border">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-bold text-foreground">Investment Horizon</span>
                  <span className="font-mono font-extrabold text-cyan-400 text-sm">
                    {years} Years ({years * 12} Months)
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="30"
                  step="1"
                  value={years}
                  onChange={(e) => setYears(Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                  <span>1 Year</span>
                  <span>15 Years</span>
                  <span>30 Years</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-surface/80 border border-border">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-bold text-foreground">Expected Annual CAGR</span>
                  <span className="font-mono font-extrabold text-amber-400 text-sm">
                    {expectedReturnRate}% p.a.
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="18"
                  step="0.5"
                  value={expectedReturnRate}
                  onChange={(e) => setExpectedReturnRate(Number(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                  <span>5% (Debt/Bonds)</span>
                  <span>12% (Equity Index)</span>
                  <span>18% (Aggressive)</span>
                </div>
              </div>
            </div>

            {/* Results Column */}
            <div className="lg:col-span-5 p-6 sm:p-8 rounded-2xl border border-primary/30 bg-primary/10 backdrop-blur-xl space-y-6">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                  Projected Future Portfolio Value
                </span>
                <p className="text-3xl sm:text-4xl font-extrabold text-foreground mt-1">
                  ₹{simulatorResults.futureValue.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Wealth multiplier: <span className="font-bold text-primary">{simulatorResults.multiplier}x your capital</span>
                </p>
              </div>

              <div className="space-y-3 pt-4 border-t border-primary/20">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Total Capital Invested</span>
                  <span className="font-mono font-bold text-foreground">
                    ₹{simulatorResults.totalInvested.toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Compound Growth / Gains</span>
                  <span className="font-mono font-bold text-emerald-400">
                    +₹{simulatorResults.wealthGained.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 pt-2">
                <div className="h-3 w-full rounded-full bg-border overflow-hidden flex">
                  <div
                    className="h-full bg-zinc-400 transition-all duration-300"
                    style={{
                      width: `${Math.round(
                        (simulatorResults.totalInvested / simulatorResults.futureValue) * 100
                      )}%`,
                    }}
                    title="Principal"
                  />
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{
                      width: `${Math.round(
                        (simulatorResults.wealthGained / simulatorResults.futureValue) * 100
                      )}%`,
                    }}
                    title="Gains"
                  />
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-zinc-400 inline-block" /> Principal
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-primary inline-block" /> Wealth Growth
                  </span>
                </div>
              </div>

              {/* Methodological & Regulatory Assumptions Disclosure */}
              <div className="p-3 rounded-xl border border-primary/20 bg-primary/5 text-[11px] text-muted-foreground space-y-1.5">
                <div className="flex items-center gap-1.5 font-semibold text-foreground text-[11px]">
                  <Info className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>Calculation Methodology & Disclaimers</span>
                </div>
                <p className="leading-relaxed">
                  <strong>Contribution Timing:</strong> Assumes recurring deposits made at the beginning of each monthly interval (annuity due formula) compounding monthly over {years} years.
                </p>
                <p className="leading-relaxed">
                  <strong>Hypothetical Returns:</strong> The {expectedReturnRate}% annualized rate is a hypothetical constant return. Nominal gains exclude taxes, inflation, and fee deductions.
                </p>
                <p className="leading-relaxed text-[10px] text-muted-foreground/80 italic pt-1 border-t border-border/40">
                  Disclaimer: Projections are strictly educational and illustrative. Not guaranteed outcomes, registered financial advice, or investment solicitations. Capital is subject to market fluctuation.
                </p>
              </div>

              <Button
                onClick={handleExploreDashboard}
                className="w-full bg-primary text-black font-bold hover:bg-primary/90 mt-2"
              >
                Start Tracking Your Wealth Now
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* 9. SECURITY & PRIVACY SECTION */}
      <section id="security" className="py-20 px-4 sm:px-6 max-w-7xl mx-auto scroll-mt-20">
        <div className="rounded-3xl border border-border bg-gradient-to-b from-card to-surface p-8 sm:p-12 relative overflow-hidden">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-4">
              <Lock className="h-3.5 w-3.5" />
              <span>Fintech Security Architecture</span>
            </div>
            <h3 className="text-3xl font-extrabold text-foreground mb-4">
              Bank-grade isolation. Zero intrusive access.
            </h3>
            <p className="text-muted-foreground leading-relaxed mb-8">
              Fyza is architected with strict Row Level Security (RLS) on PostgreSQL. We do not ask for banking passwords, UPI PINs, or OTPs. All currency calculations use integer minor units (paise) to prevent catastrophic rounding discrepancies.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <span className="text-sm text-foreground">PostgreSQL Row-Level Security</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <span className="text-sm text-foreground">Integer minor unit precision</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <span className="text-sm text-foreground">1-Click full data export (CSV/JSON)</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <span className="text-sm text-foreground">Accurate, ledger-grounded assistant</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 10. FAQ & FINAL CTA */}
      <section id="faq" className="py-20 bg-surface/40 border-t border-border/60 px-4 sm:px-6 scroll-mt-20">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-xs font-bold uppercase tracking-wider text-primary mb-2">
              Frequently Asked Questions
            </h2>
            <h3 className="text-3xl font-extrabold text-foreground">
              Everything you need to know.
            </h3>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-xl border border-border bg-card overflow-hidden transition-colors"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 font-semibold text-foreground hover:text-primary transition-colors text-sm sm:text-base"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
                        isOpen ? "rotate-180 text-primary" : "text-muted-foreground"
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-sm text-muted-foreground leading-relaxed border-t border-border/40">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FINAL CALL TO ACTION */}
      <section className="py-20 px-4 sm:px-6 max-w-7xl mx-auto text-center">
        <div className="rounded-3xl border border-primary/20 bg-gradient-to-b from-primary/10 to-transparent p-10 sm:p-16">
          <h2 className="text-3xl sm:text-5xl font-extrabold text-foreground tracking-tight mb-4">
            Start mastering your finances today.
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-8 text-base sm:text-lg">
            Join thousands tracking wealth, avoiding budget creep, and forecasting life goals with Fyza.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup">
              <Button
                size="lg"
                className="w-full sm:w-auto bg-primary text-black font-bold text-base px-8 h-12 hover:bg-primary/90 shadow-lg shadow-primary/20"
              >
                Get Started Free
              </Button>
            </Link>
            <Button
              variant="outline"
              size="lg"
              onClick={handleExploreDashboard}
              className="w-full sm:w-auto border-border bg-surface text-foreground font-semibold text-base h-12 hover:bg-surface-elevated"
            >
              Explore Interactive Demo
            </Button>
          </div>
        </div>
      </section>

      {/* 11. PROFESSIONAL FOOTER */}
      <footer className="border-t border-border py-12 px-4 sm:px-6 text-sm text-muted-foreground">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-black font-bold text-sm">
              F
            </div>
            <div>
              <span className="font-bold text-foreground">Fyza</span>
              <span className="text-xs text-muted-foreground ml-2">
                © 2026 Fyza Financial Inc. All rights reserved.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs">
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">
              Terms of Service
            </Link>
            <a
              href="mailto:support@fyza.finance"
              className="hover:text-foreground transition-colors"
            >
              Contact Support
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
