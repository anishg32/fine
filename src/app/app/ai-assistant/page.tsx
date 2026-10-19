"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Bot,
  Send,
  Sparkles,
  Trash2,
  User,
  RefreshCw,
  RotateCcw,
  Key,
  Cpu,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
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
        "Hello! I am your **Fyza personal finance assistant** powered by natural language.\n\nI have real-time visibility into your accounts, recent transactions, and active budget limits.\n\nAsk me any question in plain English or select a suggested topic below to get started!",
      created_at: "2026-10-15T00:00:00.000Z",
      source: "deterministic_engine",
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastQuery, setLastQuery] = useState("");
  const [currentPeriodName, setCurrentPeriodName] = useState("October 2026");
  const [userApiKey, setUserApiKey] = useState("");
  const [userModel, setUserModel] = useState("gpt-4o-mini");
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [tempApiKey, setTempApiKey] = useState("");
  const [tempModel, setTempModel] = useState("gpt-4o-mini");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedKey = localStorage.getItem("fyza_openai_key") || "";
      const savedModel = localStorage.getItem("fyza_openai_model") || "gpt-4o-mini";
      setUserApiKey(savedKey);
      setUserModel(savedModel);
      setTempApiKey(savedKey);
      setTempModel(savedModel);
    }
  }, []);

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
        headers: {
          "Content-Type": "application/json",
          ...(userApiKey ? { "x-openai-key": userApiKey } : {}),
        },
        body: JSON.stringify({
          message: userMsg.content,
          context,
          apiKey: userApiKey || undefined,
          model: userModel || "gpt-4o-mini",
          messages: messages.slice(-6).map((m) => ({ role: m.role, content: m.content })),
        }),
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
        toast.error(data.error || "Failed to receive response from assistant.");
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
        content: `Conversation reset. I am ready with your verified financial records for **${currentPeriodName}**. Ask me anything in plain English!`,
        created_at: new Date().toISOString(),
        source: "deterministic_engine",
      },
    ]);
    toast.success("Conversation history cleared.");
  };

  const handleSaveOpenAIKey = () => {
    if (typeof window !== "undefined") {
      const cleanKey = tempApiKey.trim();
      const cleanModel = tempModel.trim() || "gpt-4o-mini";
      if (cleanKey) {
        localStorage.setItem("fyza_openai_key", cleanKey);
        localStorage.setItem("fyza_openai_model", cleanModel);
        setUserApiKey(cleanKey);
        setUserModel(cleanModel);
        toast.success(`Connected to OpenAI ChatGPT (${cleanModel})!`);
      } else {
        localStorage.removeItem("fyza_openai_key");
        localStorage.removeItem("fyza_openai_model");
        setUserApiKey("");
        setUserModel("gpt-4o-mini");
        toast.info("Cleared OpenAI key. Switched to built-in NLP engine.");
      }
    }
    setIsKeyModalOpen(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8.5rem)] max-w-4xl mx-auto space-y-3">
      {/* Header with Verified Facts Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-sm shrink-0">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2 flex-wrap">
              Financial Assistant
              {userApiKey ? (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 shadow-sm">
                  <Cpu className="h-3 w-3" /> ChatGPT ({userModel})
                </span>
              ) : (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" /> NLP Engine Active
                </span>
              )}
            </h2>
            <p className="text-xs text-muted-foreground">
              Period: <span className="font-semibold text-foreground">{currentPeriodName}</span> • Real-time ledger insights
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsKeyModalOpen(true)}
            className="text-xs flex items-center gap-1.5 h-8 border-primary/30 text-foreground hover:bg-primary/10"
          >
            <Key className="h-3 w-3 text-primary" /> {userApiKey ? "ChatGPT Active" : "ChatGPT Key"}
          </Button>

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
                  <div className="flex items-center gap-2 px-1 text-[11px] text-muted-foreground">
                    <span className="font-semibold text-foreground/80">
                      {m.source === "live_ai" ? "OpenAI ChatGPT" : "Fyza Assistant"}
                    </span>
                    <span>•</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-surface border border-border">
                      {m.source === "live_ai" ? (userModel || "gpt-4o-mini") : "NLP Engine"}
                    </span>
                    <span>•</span>
                    <span>{currentPeriodName}</span>
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

      {/* OpenAI ChatGPT Configuration Modal */}
      <Dialog open={isKeyModalOpen} onOpenChange={setIsKeyModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Cpu className="h-5 w-5 text-primary" />
              ChatGPT / OpenAI Configuration
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Optionally provide your own OpenAI API key to enable live conversational ChatGPT responses tailored to your financial ledger.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="apiKey" className="text-xs text-muted-foreground">
                OpenAI API Key (sk-...)
              </Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="sk-proj-..."
                value={tempApiKey}
                onChange={(e) => setTempApiKey(e.target.value)}
                className="text-xs font-mono"
              />
              <p className="text-[10px] text-muted-foreground">
                Your key is stored only in your local browser and sent securely via server headers.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="model" className="text-xs text-muted-foreground">
                ChatGPT Model
              </Label>
              <select
                id="model"
                value={tempModel}
                onChange={(e) => setTempModel(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-border bg-surface text-xs text-foreground focus:outline-none focus:border-primary"
              >
                <option value="gpt-4o-mini">gpt-4o-mini (Recommended — fast & precise)</option>
                <option value="gpt-4o">gpt-4o (Most capable financial reasoning)</option>
                <option value="gpt-3.5-turbo">gpt-3.5-turbo (Legacy fast model)</option>
              </select>
            </div>

            {userApiKey && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2 text-xs text-emerald-400">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>ChatGPT is currently connected and active.</span>
              </div>
            )}
          </div>

          <DialogFooter className="flex sm:justify-between items-center gap-2">
            {userApiKey && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setTempApiKey("");
                  handleSaveOpenAIKey();
                }}
                className="text-xs text-rose-400 hover:text-rose-300"
              >
                Disconnect Key
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsKeyModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSaveOpenAIKey}
                className="text-xs bg-primary text-black font-semibold hover:bg-primary/90"
              >
                Save & Connect
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

