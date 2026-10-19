"use client";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Bot,
  Send,
  Sparkles,
  Trash2,
  User,
  RotateCcw,
  Key,
  Cpu,
  CheckCircle2,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Copy,
  Check,
  Headphones,
  Compass,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  CheckCheck,
  XCircle,
  Play,
  Puzzle,
  AlertCircle,
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
import { AgentExecutor } from "@/lib/agent/executor";
import type { AgentAction } from "@/lib/agent/types";
import { toast } from "sonner";

const CONVERSATIONAL_PROMPTS = [
  "Open my dashboard",
  "Show my expenses from this month",
  "Open budgets",
  "Open savings goals",
  "Change to dark mode",
  "Switch to ocean blue",
  "Go back",
  "Open a new tab and visit https://github.com/anishg32/fine",
  "Summarize this page",
  "Can we talk about my money?",
  "Where did most of my money go?",
  "Can I afford a purchase of ₹15,000?",
  "How can I improve my savings rate?",
];

interface ChatMessageExtended extends AIMessage {
  source?: "live_ai" | "deterministic_engine";
  action?: AgentAction;
}

function cleanTextForSpeech(text: string): string {
  return text
    .replace(/[#*_~`]/g, "")
    .replace(/•/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/₹(\d+(?:,\d+)*(?:\.\d+)?)/g, "$1 rupees")
    .trim();
}

function ActionControlCard({
  action,
  onExecute,
  onReject,
}: {
  action: AgentAction;
  onExecute: () => void;
  onReject: () => void;
}) {
  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case "low":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm">
            <ShieldCheck className="h-3 w-3" /> LOW RISK
          </span>
        );
      case "high":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30 shadow-sm">
            <ShieldAlert className="h-3 w-3" /> HIGH RISK • CONFIRMATION REQUIRED
          </span>
        );
      case "medium":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-sm">
            <ShieldAlert className="h-3 w-3" /> MEDIUM RISK • APPROVAL REQUIRED
          </span>
        );
    }
  };

  const getStatusText = () => {
    switch (action.status) {
      case "preparing":
        return "Preparing action...";
      case "waiting_approval":
        return "Waiting for your approval...";
      case "executing":
        return "Executing action...";
      case "completed":
        return "Action completed.";
      case "failed":
        return action.error ? `Action failed: ${action.error}` : "Action failed.";
      case "cancelled":
        return "Action cancelled by user.";
      default:
        return "Ready";
    }
  };

  const isPending = action.status === "waiting_approval" || action.status === "preparing";

  return (
    <div className="mt-3 p-3.5 rounded-xl border border-primary/20 bg-surface-secondary/90 backdrop-blur-md space-y-3 shadow-md">
      {/* Title & Risk Badge */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <Compass className="h-3.5 w-3.5" />
          </div>
          <span className="text-xs font-bold text-foreground">{action.title}</span>
        </div>
        {getRiskBadge(action.risk)}
      </div>

      {/* Description */}
      <p className="text-xs text-muted-foreground leading-relaxed">{action.description}</p>

      {/* Target Preview */}
      {action.target && (
        <div className="px-2.5 py-1.5 rounded-lg bg-surface border border-border/80 text-[11px] font-mono flex items-center justify-between gap-2 overflow-hidden text-ellipsis">
          <span className="text-muted-foreground truncate">Target: {action.target}</span>
          {action.type === "open_authorized_external_url" && (
            <ExternalLink className="h-3 w-3 shrink-0 text-primary" />
          )}
        </div>
      )}

      {/* Control Status and Execution Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-border/40 text-[11px]">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          {action.status === "executing" && (
            <span className="h-2 w-2 rounded-full bg-primary animate-ping shrink-0" />
          )}
          {action.status === "completed" && (
            <CheckCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
          )}
          {action.status === "failed" && (
            <XCircle className="h-3.5 w-3.5 text-rose-400 shrink-0" />
          )}
          <span
            className={`font-medium ${
              action.status === "completed"
                ? "text-emerald-400"
                : action.status === "failed"
                ? "text-rose-400"
                : action.status === "cancelled"
                ? "text-muted-foreground line-through"
                : "text-foreground/90"
            }`}
          >
            {getStatusText()}
          </span>
        </div>

        {/* Action Buttons */}
        {isPending && (
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              size="sm"
              variant="outline"
              onClick={onReject}
              className="h-7 text-xs px-2.5 text-muted-foreground hover:text-foreground"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={onExecute}
              className="h-7 text-xs px-3 bg-primary text-black font-semibold hover:bg-primary/90 shadow-sm flex items-center gap-1.5"
            >
              <Play className="h-3 w-3 fill-current" />
              {action.requiresApproval ? "Approve & Execute" : "Execute Now"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AIAssistantPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessageExtended[]>([
    {
      id: "msg-welcome",
      conversation_id: "conv-1",
      role: "assistant",
      content:
        "Hello! 👋 I'm **Fyza AI**, your personal financial assistant and website control agent.\n\nI can talk naturally through your money with you, or directly navigate Fyza pages, switch themes, and control authorized external browser tasks.\n\nTry asking: *\"Open my dashboard\"*, *\"Show my expenses from this month\"*, *\"Change to dark mode\"*, or *\"Open a new tab and visit https://github.com/anishg32/fine\"*!",
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

  // Browser Control Companion Extension State
  const [isExtensionActive, setIsExtensionActive] = useState(false);
  const [isExtensionModalOpen, setIsExtensionModalOpen] = useState(false);

  // Voice & Talking States
  const [isListening, setIsListening] = useState(false);
  const [currentlySpeakingId, setCurrentlySpeakingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // ChatGPT-style Live Voice Mode (Hands-free continuous conversation)
  const [isVoiceModeOpen, setIsVoiceModeOpen] = useState(false);
  const [voiceModeStatus, setVoiceModeStatus] = useState<"idle" | "listening" | "thinking" | "speaking">("idle");
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceLastResponse, setVoiceLastResponse] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isVoiceModeOpenRef = useRef(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inputRecognitionRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const voiceModeRecognitionRef = useRef<any>(null);

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

  // Poll for Companion Extension presence
  useEffect(() => {
    setIsExtensionActive(AgentExecutor.isExtensionInstalled());
    const interval = setInterval(() => {
      setIsExtensionActive(AgentExecutor.isExtensionInstalled());
    }, 2000);
    return () => clearInterval(interval);
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

  // Clean up any ongoing speech synthesis or speech recognition on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      try {
        inputRecognitionRef.current?.abort();
        voiceModeRecognitionRef.current?.abort();
      } catch {}
    };
  }, []);

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

  const handleSendMessage = async (textToSend?: string): Promise<string | null> => {
    const query = textToSend || input;
    if (!query.trim() || loading) return null;

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
          action: data.action,
        };
        setMessages((prev) => [...prev, assistantMsg]);
        return data.reply;
      } else {
        toast.error(data.error || "Failed to receive response from assistant.");
        return null;
      }
    } catch {
      toast.error("Network error while connecting to assistant.");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteAction = async (msgId: string, action: AgentAction) => {
    // 1. Update action status to executing
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId && m.action
          ? { ...m, action: { ...m.action, status: "executing" } }
          : m
      )
    );

    // 2. Execute via AgentExecutor
    const res = await AgentExecutor.executeAction(action, (path) => {
      router.push(path);
    });

    // 3. Update status on completion or failure
    if (res.success) {
      toast.success(res.result || "Action executed successfully!");
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId && m.action
            ? { ...m, action: { ...m.action, status: "completed" } }
            : m
        )
      );
    } else {
      toast.error(res.error || "Action execution failed.");
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId && m.action
            ? { ...m, action: { ...m.action, status: "failed", error: res.error } }
            : m
        )
      );
    }
  };

  const handleRejectAction = (msgId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId && m.action
          ? { ...m, action: { ...m.action, status: "cancelled" } }
          : m
      )
    );
    toast.info("Action cancelled by user.");
  };

  const handleRetryLast = () => {
    if (lastQuery) {
      handleSendMessage(lastQuery);
    }
  };

  const handleClearHistory = () => {
    stopSpeaking();
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
        toast.info("Cleared OpenAI key. Switched to built-in conversational engine.");
      }
    }
    setIsKeyModalOpen(false);
  };

  // Text-to-Speech Engine
  const speakText = (text: string, messageId?: string, onEnd?: () => void) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      toast.error("Speech synthesis is not supported in this browser.");
      onEnd?.();
      return;
    }

    window.speechSynthesis.cancel();
    if (messageId && currentlySpeakingId === messageId) {
      setCurrentlySpeakingId(null);
      return;
    }

    const clean = cleanTextForSpeech(text);
    if (!clean) {
      onEnd?.();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const englishVoice =
      voices.find(
        (v) =>
          v.lang.startsWith("en") &&
          (v.name.includes("Natural") ||
            v.name.includes("Google") ||
            v.name.includes("Samantha") ||
            v.name.includes("Daniel") ||
            v.name.includes("Siri") ||
            v.name.includes("Karen"))
      ) || voices.find((v) => v.lang.startsWith("en"));

    if (englishVoice) {
      utterance.voice = englishVoice;
    }

    if (messageId) {
      setCurrentlySpeakingId(messageId);
    }

    utterance.onend = () => {
      setCurrentlySpeakingId(null);
      onEnd?.();
    };

    utterance.onerror = () => {
      setCurrentlySpeakingId(null);
      onEnd?.();
    };

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setCurrentlySpeakingId(null);
    }
  };

  const handleCopyMessage = (text: string, id: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  // Input Bar Speech Recognition (Dictation)
  const toggleInputListening = () => {
    if (typeof window === "undefined") return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error("Speech recognition is not supported in this browser. Please use Chrome, Safari, or Edge.");
      return;
    }

    if (isListening) {
      inputRecognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "en-IN";
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          setInput(transcript);
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      inputRecognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  // ChatGPT-style Live Voice Mode (Continuous hands-free conversation)
  const openVoiceMode = () => {
    setIsVoiceModeOpen(true);
    isVoiceModeOpenRef.current = true;
    setVoiceTranscript("");
    setVoiceLastResponse("");
    stopSpeaking();
    startVoiceModeListening();
  };

  const closeVoiceMode = () => {
    setIsVoiceModeOpen(false);
    isVoiceModeOpenRef.current = false;
    stopSpeaking();
    if (voiceModeRecognitionRef.current) {
      try {
        voiceModeRecognitionRef.current.abort();
      } catch {}
    }
    setVoiceModeStatus("idle");
  };

  const startVoiceModeListening = () => {
    if (typeof window === "undefined" || !isVoiceModeOpenRef.current) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceModeStatus("idle");
      toast.error("Speech recognition requires Chrome, Edge, or Safari.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "en-IN";
      recognition.continuous = false;
      recognition.interimResults = true;

      let capturedText = "";

      recognition.onstart = () => {
        if (isVoiceModeOpenRef.current) {
          setVoiceModeStatus("listening");
        }
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        let currentTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          currentTranscript += event.results[i][0].transcript;
        }
        if (currentTranscript) {
          capturedText = currentTranscript;
          setVoiceTranscript(currentTranscript);
        }
      };

      recognition.onerror = () => {
        if (isVoiceModeOpenRef.current) {
          setVoiceModeStatus("idle");
        }
      };

      recognition.onend = async () => {
        if (!isVoiceModeOpenRef.current) return;

        if (capturedText.trim()) {
          setVoiceModeStatus("thinking");
          const reply = await handleSendMessage(capturedText.trim());
          if (reply && isVoiceModeOpenRef.current) {
            setVoiceLastResponse(reply);
            setVoiceModeStatus("speaking");
            speakText(reply, undefined, () => {
              if (isVoiceModeOpenRef.current) {
                setVoiceTranscript("");
                startVoiceModeListening();
              }
            });
          } else {
            setVoiceModeStatus("idle");
          }
        } else {
          setVoiceModeStatus("idle");
        }
      };

      voiceModeRecognitionRef.current = recognition;
      recognition.start();
    } catch {
      setVoiceModeStatus("idle");
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8.5rem)] max-w-4xl mx-auto space-y-3">
      {/* Header with Talking Together & Verified Facts Banner */}
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

        <div className="flex items-center gap-2 flex-wrap">
          {/* Companion Extension Status Indicator */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExtensionModalOpen(true)}
            className={`text-xs flex items-center gap-1.5 h-8 border transition-all ${
              isExtensionActive
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 shadow-sm"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
            title="Fyza Browser Control Extension Status"
          >
            <Puzzle className="h-3.5 w-3.5" />
            {isExtensionActive ? "Extension: Connected" : "Extension: Setup"}
          </Button>

          {/* ChatGPT-style Live Voice Mode Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={openVoiceMode}
            className="text-xs flex items-center gap-1.5 h-8 border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 shadow-sm"
          >
            <Headphones className="h-3.5 w-3.5" /> Voice Mode (Talk Live)
          </Button>

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
          <Sparkles className="h-3 w-3 text-primary" /> Suggested Questions & Follow-ups
        </p>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {CONVERSATIONAL_PROMPTS.map((prompt, idx) => (
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

                {/* Website Control Action Card */}
                {m.action && (
                  <ActionControlCard
                    action={m.action}
                    onExecute={() => handleExecuteAction(m.id, m.action!)}
                    onReject={() => handleRejectAction(m.id)}
                  />
                )}

                {!isUser && (
                  <div className="flex items-center justify-between gap-2 px-1 text-[11px] text-muted-foreground">
                    <div className="flex items-center gap-2">
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

                    {/* Audio Read-out and Copy actions for ChatGPT Talking Together feel */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => speakText(m.content, m.id)}
                        title={currentlySpeakingId === m.id ? "Stop voice" : "Listen aloud"}
                        className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
                      >
                        {currentlySpeakingId === m.id ? (
                          <VolumeX className="h-3.5 w-3.5 text-rose-400 animate-pulse" />
                        ) : (
                          <Volume2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopyMessage(m.content, m.id)}
                        title="Copy message"
                        className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
                      >
                        {copiedId === m.id ? (
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-lg bg-surface-secondary border border-border flex items-center justify-center text-primary shrink-0 shadow-sm">
              <Bot className="h-4 w-4" />
            </div>
            <div className="p-3.5 rounded-2xl bg-surface border border-border/80 text-xs text-muted-foreground flex items-center gap-2 shadow-sm">
              <div className="flex gap-1 items-center px-1">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" />
              </div>
              <span className="text-foreground/80 font-medium">Fyza is thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </Card>

      {/* Input Prompt Box with Voice Microphone & Send */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="flex items-center gap-2 pt-1"
      >
        <Input
          placeholder={
            isListening
              ? "Listening to your voice... (speak now)"
              : "Chat with Fyza AI about your money, budgets, or ask anything..."
          }
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          className={`flex-1 text-sm h-11 bg-card border-border shadow-sm focus:border-primary ${
            isListening ? "border-rose-500 ring-2 ring-rose-500/20 text-rose-300" : ""
          }`}
        />

        {/* Speech Dictation Button */}
        <Button
          type="button"
          variant="outline"
          onClick={toggleInputListening}
          title={isListening ? "Stop listening" : "Talk to Fyza (Microphone)"}
          className={`h-11 px-3.5 shrink-0 border-border transition-all ${
            isListening
              ? "bg-rose-500/20 border-rose-500 text-rose-400 shadow-md shadow-rose-500/20 animate-pulse"
              : "hover:bg-surface text-muted-foreground hover:text-foreground"
          }`}
        >
          {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </Button>

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

      {/* ChatGPT-Style Live Voice Mode Dialog */}
      <Dialog open={isVoiceModeOpen} onOpenChange={(open) => {
        if (!open) closeVoiceMode();
      }}>
        <DialogContent className="sm:max-w-md bg-zinc-950/95 border-zinc-800 text-zinc-100 p-6 backdrop-blur-2xl">
          <div className="flex flex-col items-center justify-center text-center space-y-6 py-2">
            {/* Header */}
            <div className="flex items-center justify-between w-full border-b border-zinc-800/80 pb-3">
              <div className="flex items-center gap-2">
                <Headphones className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                  Fyza Voice Mode
                </span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400">
                Talking Together
              </span>
            </div>

            {/* Pulsating Voice Orb */}
            <div className="relative flex items-center justify-center my-4">
              {voiceModeStatus === "speaking" && (
                <>
                  <span className="absolute h-40 w-40 rounded-full bg-cyan-500/10 animate-ping" />
                  <span className="absolute h-32 w-32 rounded-full bg-primary/20 animate-pulse" />
                </>
              )}
              {voiceModeStatus === "listening" && (
                <>
                  <span className="absolute h-40 w-40 rounded-full bg-emerald-500/15 animate-ping" />
                  <span className="absolute h-32 w-32 rounded-full bg-emerald-500/25 animate-pulse" />
                </>
              )}
              {voiceModeStatus === "thinking" && (
                <span className="absolute h-32 w-32 rounded-full bg-amber-500/20 animate-spin border-t-2 border-amber-400" />
              )}

              <button
                type="button"
                onClick={() => {
                  if (voiceModeStatus === "listening") {
                    voiceModeRecognitionRef.current?.stop();
                    setVoiceModeStatus("idle");
                  } else if (voiceModeStatus === "speaking") {
                    stopSpeaking();
                    setVoiceModeStatus("idle");
                  } else {
                    startVoiceModeListening();
                  }
                }}
                className={`relative h-28 w-28 rounded-full flex flex-col items-center justify-center shadow-2xl transition-all duration-300 cursor-pointer ${
                  voiceModeStatus === "listening"
                    ? "bg-gradient-to-tr from-emerald-600 to-teal-400 text-white shadow-emerald-500/30 scale-105"
                    : voiceModeStatus === "speaking"
                    ? "bg-gradient-to-tr from-cyan-600 via-primary to-blue-500 text-black shadow-cyan-500/30 scale-105"
                    : voiceModeStatus === "thinking"
                    ? "bg-gradient-to-tr from-amber-600 to-yellow-400 text-black shadow-amber-500/20"
                    : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                }`}
              >
                {voiceModeStatus === "listening" ? (
                  <Mic className="h-10 w-10 animate-pulse" />
                ) : voiceModeStatus === "speaking" ? (
                  <Volume2 className="h-10 w-10 animate-bounce" />
                ) : voiceModeStatus === "thinking" ? (
                  <Sparkles className="h-9 w-9 animate-spin" />
                ) : (
                  <MicOff className="h-9 w-9 text-zinc-400" />
                )}
              </button>
            </div>

            {/* Status Pill */}
            <div className="flex items-center gap-2">
              <span
                className={`h-2 w-2 rounded-full ${
                  voiceModeStatus === "listening"
                    ? "bg-emerald-400 animate-ping"
                    : voiceModeStatus === "speaking"
                    ? "bg-cyan-400 animate-pulse"
                    : voiceModeStatus === "thinking"
                    ? "bg-amber-400 animate-spin"
                    : "bg-zinc-500"
                }`}
              />
              <span className="text-xs font-semibold tracking-wide text-zinc-200">
                {voiceModeStatus === "listening" && "Listening... Speak naturally"}
                {voiceModeStatus === "speaking" && "Fyza is speaking..."}
                {voiceModeStatus === "thinking" && "Fyza is thinking..."}
                {voiceModeStatus === "idle" && "Tap orb or mic to speak"}
              </span>
            </div>

            {/* Live Transcript / Dialogue Box */}
            <div className="w-full max-h-36 overflow-y-auto rounded-xl bg-zinc-900/80 border border-zinc-800/80 p-3.5 text-left space-y-2">
              {voiceTranscript && (
                <div className="text-xs text-zinc-300">
                  <span className="font-semibold text-emerald-400">You: </span>
                  {voiceTranscript}
                </div>
              )}
              {voiceLastResponse ? (
                <div className="text-xs text-zinc-300 leading-relaxed whitespace-pre-line">
                  <span className="font-semibold text-primary">Fyza: </span>
                  {voiceLastResponse.length > 250
                    ? `${voiceLastResponse.slice(0, 250)}...`
                    : voiceLastResponse}
                </div>
              ) : (
                !voiceTranscript && (
                  <p className="text-[11px] text-zinc-500 italic text-center py-2">
                    Speak anything naturally — &quot;Can we talk about my money?&quot;, &quot;What should I do first?&quot;, or &quot;How to save?&quot;
                  </p>
                )
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between w-full pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (voiceModeStatus === "listening") {
                    voiceModeRecognitionRef.current?.stop();
                    setVoiceModeStatus("idle");
                  } else {
                    startVoiceModeListening();
                  }
                }}
                className="text-xs border-zinc-800 text-zinc-300 hover:text-white"
              >
                {voiceModeStatus === "listening" ? "Pause Mic" : "Resume Mic"}
              </Button>

              {voiceModeStatus === "speaking" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={stopSpeaking}
                  className="text-xs border-zinc-800 text-rose-400 hover:bg-rose-500/10"
                >
                  Interrupt Voice
                </Button>
              )}

              <Button
                size="sm"
                onClick={closeVoiceMode}
                className="text-xs bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
              >
                Return to Chat
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
                <option value="gpt-4o-mini">gpt-4o-mini (Recommended — fast &amp; precise)</option>
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
                Save &amp; Connect
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Companion Browser Extension Modal */}
      <Dialog open={isExtensionModalOpen} onOpenChange={setIsExtensionModalOpen}>
        <DialogContent className="sm:max-w-md bg-surface border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <Puzzle className="h-4 w-4 text-primary" />
              Browser Control Companion Extension
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Fyza uses an explicitly authorized companion extension to safely assist you with external websites without compromising browser security.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            {isExtensionActive ? (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2.5 text-xs text-emerald-400">
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Companion Extension Connected</p>
                  <p className="text-[11px] text-emerald-400/80 mt-0.5">
                    Fyza is connected to your browser companion. You can now request authorized external tab actions, page summaries, and guided browser workflows.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-surface-secondary border border-border space-y-2 text-xs">
                <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>Extension Not Detected in Active Tab</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Web browsers enforce strict Same-Origin policies preventing standard web apps from controlling other tabs. To enable external browser actions, load the bundled companion extension:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-foreground font-medium pl-1">
                  <li>Open <code className="bg-surface px-1 py-0.5 rounded text-primary">chrome://extensions</code> in your browser</li>
                  <li>Enable the <span className="text-primary">Developer mode</span> switch (top-right)</li>
                  <li>Click <span className="text-primary">Load unpacked</span></li>
                  <li>Select the <code className="bg-surface px-1 py-0.5 rounded">fine wise/extension</code> directory</li>
                </ol>
              </div>
            )}

            <div className="p-3 rounded-lg bg-surface border border-border space-y-1.5 text-[11px] text-muted-foreground">
              <p className="font-semibold text-foreground flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Security Guarantee
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-[10px]">
                <li>Zero background surveillance or history collection.</li>
                <li>Actions require your explicit one-time confirmation.</li>
                <li>Sandboxed DOM inspection with prompt-injection defense.</li>
              </ul>
            </div>
          </div>

          <DialogFooter className="flex sm:justify-end">
            <Button
              type="button"
              size="sm"
              onClick={() => setIsExtensionModalOpen(false)}
              className="text-xs bg-primary text-black font-semibold hover:bg-primary/90"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
