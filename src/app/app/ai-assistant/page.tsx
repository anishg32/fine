"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Bot,
  Send,
  Sparkles,
  Trash2,
  User,
  ShieldCheck,
  RefreshCw,
  RotateCcw,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { fyzaStore } from "@/lib/store";
import {
  calculateTotalBalance,
  calculatePeriodIncome,
  calculatePeriodExpenses,
  calculateNetCashFlow,
  calculateSavingsRate,
  calculateSpendingByCategory,
  calculateEmergencyBuffer,
} from "@/lib/calculations";
import type { AIMessage, RecurringTransaction } from "@/lib/types";
import { toast } from "sonner";

const PHASE4_SUGGESTED_PROMPTS = [
  "Where did most of my money go this month?",
  "How much did I spend on food and groceries?",
  "Which budgets are close to their limits?",
  "How has my spending changed compared with last month?",
  "How much money remains after my recorded expenses?",
  "How much should I contribute monthly to reach my savings goal?",
  "What happens if I reduce a selected expense category?",
  "What recurring payments are coming up?",
];

interface ChatMessageExtended extends AIMessage {
  source?: "live_ai" | "deterministic_engine";
}

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<ChatMessageExtended[]>([
    {
      id: "msg-welcome",
      conversation_id: "conv-1",
      role: "assistant",
      content:
        "Hello! I am **Fyza AI**, your grounded personal finance intelligence assistant.\n\nAll financial figures and totals I provide are derived directly from your **verified ledger records and deterministic math engines**.\n\nSelect any question below or ask me about your spending, emergency buffer, budget caps, or savings forecasts!",
      created_at: "2026-10-15T00:00:00.000Z",
      source: "deterministic_engine",
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastQuery, setLastQuery] = useState("");
  const [currentPeriodName, setCurrentPeriodName] = useState("October 2026");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const d = new Date();
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    setCurrentPeriodName(`${monthNames[d.getMonth()]} ${d.getFullYear()}`);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const buildContext = () => {
    const accounts = fyzaStore.getAccounts();
    const transactions = fyzaStore.getTransactions();
    const budgets = fyzaStore.getBudgets();
    const goals = fyzaStore.getGoals();
    const recurring = fyzaStore.getRecurringTransactions();

    const now = new Date();
    const currentPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth();
    const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const prevPrefix = `${prevYear}-${String(prevMonth).padStart(2, "0")}`;

    const monthTxs = transactions.filter((t) => t.transaction_date.startsWith(currentPrefix));
    const prevMonthTxs = transactions.filter((t) => t.transaction_date.startsWith(prevPrefix));

    const totalBalanceMinor = calculateTotalBalance(accounts);
    const periodIncomeMinor = calculatePeriodIncome(monthTxs);
    const periodExpensesMinor = calculatePeriodExpenses(monthTxs);
    const priorMonthExpensesMinor = calculatePeriodExpenses(prevMonthTxs);
    const netCashFlowMinor = calculateNetCashFlow(periodIncomeMinor, periodExpensesMinor);
    const savingsRatePct = calculateSavingsRate(periodIncomeMinor, periodExpensesMinor);

    const categoriesMap = fyzaStore.getCategories().reduce<Record<string, { name: string; icon: string; color: string }>>((acc, c) => {
      acc[c.id] = { name: c.name, icon: c.icon, color: c.color };
      return acc;
    }, {});

    const spendingByCategory = calculateSpendingByCategory(
      monthTxs.filter((t) => t.type === "expense"),
      categoriesMap
    ).map((c) => ({
      category: c.category,
      amountMinor: c.amount,
      percentage: c.percentage,
    }));

    const activeBudget = budgets[0]
      ? {
          name: budgets[0].name,
          limitMinor: budgets[0].total_limit,
          spentMinor: periodExpensesMinor,
        }
      : undefined;

    const goalsSummary = goals.map((g) => ({
      name: g.name,
      targetMinor: g.target_amount,
      currentMinor: g.current_amount,
      targetDate: g.target_date || undefined,
    }));

    const emergencyBuffer = calculateEmergencyBuffer({
      accounts,
      essentialMonthlyExpenseMinor: Math.max(1, periodExpensesMinor),
    });

    const upcomingBills = recurring
      .filter((r: RecurringTransaction) => r.is_active && r.type === "expense")
      .map((r: RecurringTransaction) => ({
        name: r.merchant || r.description,
        amountMinor: r.amount,
        nextDate: r.next_date,
        category: categoriesMap[r.category_id || ""]?.name || "General",
      }));

    return {
      totalBalanceMinor,
      periodIncomeMinor,
      periodExpensesMinor,
      priorMonthExpensesMinor,
      netCashFlowMinor,
      savingsRatePct,
      spendingByCategory,
      activeBudget,
      budgets: budgets.map((b) => ({ name: b.name, limitMinor: b.total_limit, spentMinor: periodExpensesMinor })),
      goals: goalsSummary,
      emergencyMonths: emergencyBuffer.monthsCovered,
      upcomingBills,
      selectedPeriodLabel: currentPeriodName,
      transactionCount: monthTxs.length,
    };
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim() || loading) return;

    setLastQuery(query.trim());

    const userMsg: ChatMessageExtended = {
      id: `usr-${Date.now()}`,
      conversation_id: "conv-1",
      role: "user",
      content: query.trim(),
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const context = buildContext();
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg.content, context }),
      });

      const data = await res.json();

      if (data.reply) {
        const assistantMsg: ChatMessageExtended = {
          id: `asst-${Date.now()}`,
          conversation_id: "conv-1",
          role: "assistant",
          content: data.reply,
          created_at: new Date().toISOString(),
          source: data.source || "deterministic_engine",
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        toast.error("Failed to receive response from assistant.");
      }
    } catch {
      toast.error("Network error while connecting to assistant.");
    } finally {
      setLoading(false);
    }
  };

  const handleRetryLast = () => {
    if (lastQuery) {
      handleSendMessage(lastQuery);
    }
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: "msg-welcome-new",
        conversation_id: "conv-1",
        role: "assistant",
        content: `Conversation reset. I am ready with your verified financial records for **${currentPeriodName}**. Ask me anything!`,
        created_at: new Date().toISOString(),
        source: "deterministic_engine",
      },
    ]);
    toast.success("Conversation history cleared.");
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8.5rem)] max-w-4xl mx-auto space-y-3">
      {/* Header with Verified Facts Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-black shadow-lg shadow-primary/20 shrink-0">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              Fyza Financial Intelligence
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20 flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" /> Grounded Ledger Math
              </span>
            </h2>
            <p className="text-xs text-muted-foreground">
              Period: <span className="font-semibold text-foreground">{currentPeriodName}</span> • Verified Integer Paired Balances
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {lastQuery && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetryLast}
              disabled={loading}
              className="text-xs flex items-center gap-1.5 h-8"
            >
              <RotateCcw className="h-3 w-3" /> Retry
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearHistory}
            className="text-xs flex items-center gap-1.5 h-8 text-muted-foreground hover:text-foreground"
          >
            <Trash2 className="h-3 w-3" /> New Chat
          </Button>
        </div>
      </div>

      {/* Suggested Questions Carousel */}
      <div className="space-y-1">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
          <Sparkles className="h-3 w-3 text-primary" /> Suggested Questions
        </p>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {PHASE4_SUGGESTED_PROMPTS.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(prompt)}
              disabled={loading}
              className="whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium border border-border bg-surface hover:bg-surface-elevated hover:border-primary/40 text-foreground transition-all shrink-0 hover:shadow-sm"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Messages Log */}
      <Card className="flex-1 overflow-y-auto p-4 space-y-4 border-border bg-card/60 backdrop-blur-sm shadow-inner">
        {messages.map((m) => {
          const isUser = m.role === "user";
          return (
            <div
              key={m.id}
              className={`flex items-start gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
            >
              <div
                className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm ${
                  isUser
                    ? "bg-primary text-black font-bold text-xs"
                    : "bg-surface-secondary border border-border text-primary"
                }`}
              >
                {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>

              <div className="max-w-[85%] sm:max-w-[78%] space-y-1.5">
                <div
                  className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-line ${
                    isUser
                      ? "bg-primary text-black font-medium rounded-tr-none shadow-md"
                      : "bg-surface border border-border/80 text-foreground rounded-tl-none shadow-sm"
                  }`}
                >
                  {m.content}
                </div>

                {!isUser && (
                  <div className="flex items-center gap-2 px-1 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1 text-primary font-medium">
                      <Zap className="h-2.5 w-2.5" />
                      {m.source === "live_ai"
                        ? "Grounded Live AI"
                        : "Deterministic Financial Engine"}
                    </span>
                    <span>•</span>
                    <span>Verified Snapshot: {currentPeriodName}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-lg bg-surface-secondary border border-border flex items-center justify-center text-primary">
              <Bot className="h-4 w-4" />
            </div>
            <div className="p-3.5 rounded-2xl bg-surface border border-border text-xs text-muted-foreground flex items-center gap-2">
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-primary" />
              <span>Analyzing verified ledger records...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </Card>

      {/* Input Prompt Box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="flex items-center gap-2 pt-1"
      >
        <Input
          placeholder="Ask Fyza AI anything about your money, budgets, or what-if plans..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          className="flex-1 text-sm h-11 bg-card border-border shadow-sm focus:border-primary"
        />
        <Button
          type="submit"
          disabled={loading || !input.trim()}
          className="h-11 px-5 bg-primary text-black font-semibold hover:bg-primary/90 shrink-0 shadow-md shadow-primary/10"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>

      {/* Disclaimer footer */}
      <p className="text-[11px] text-center text-muted-foreground">
        Financial facts are calculated deterministically. Fyza AI provides budgeting guidance, not individualized professional financial advice.
      </p>
    </div>
  );
}

