"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  Sparkles,
  Mic,
  MicOff,
  ArrowRight,
  CheckCircle2,
  Calendar,
  Wallet,
  Tag,
  Store,
  Layers,
  Edit3,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fyzaStore } from "@/lib/store";
import { parseNaturalLanguageTransaction, type ParsedTransactionResult } from "@/lib/ai-nlp";
import { formatCurrency } from "@/lib/utils";
import type { Account, Category, Transaction } from "@/lib/types";
import { toast } from "sonner";

interface AINaturalLanguageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenStandardForm?: (prefilled: Partial<Transaction>) => void;
  onSaved?: () => void;
}

const EXAMPLE_PROMPTS = [
  { label: "☕ Starbucks Coffee", text: "Spent ₹350 on coffee at Starbucks with HDFC Credit Card" },
  { label: "🛒 Blinkit Groceries", text: "Paid ₹2,400 for groceries at Blinkit via ICICI" },
  { label: "💼 Monthly Salary", text: "Salary credited ₹1,45,000 from Google into Salary Account" },
  { label: "🔁 Account Transfer", text: "Transferred ₹15,000 from Savings to Emergency Fund" },
  { label: "🚗 Uber Ride", text: "Uber cab to airport ₹850 yesterday" },
  { label: "💡 Electricity Bill", text: "Paid electricity bill ₹3,200 via HDFC Bank" },
];

interface SpeechRecognitionResultItem {
  transcript: string;
}

interface SpeechRecognitionResultList {
  [index: number]: {
    [index: number]: SpeechRecognitionResultItem;
  };
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: () => void;
  onend: () => void;
  start: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

export function AINaturalLanguageDialog({
  open,
  onOpenChange,
  onOpenStandardForm,
  onSaved,
}: AINaturalLanguageDialogProps) {
  const [input, setInput] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [parsed, setParsed] = useState<ParsedTransactionResult | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      const accs = fyzaStore.getAccounts();
      const cats = fyzaStore.getCategories();
      setAccounts(accs);
      setCategories(cats);
      setInput("");
      setParsed(null);
      setIsListening(false);
    }
  }, [open]);

  // Reactive parsing as user types
  const handleInputChange = (text: string) => {
    setInput(text);
    if (!text.trim()) {
      setParsed(null);
      return;
    }

    startTransition(() => {
      const result = parseNaturalLanguageTransaction(text, accounts, categories);
      setParsed(result);
    });
  };

  const handleSelectExample = (text: string) => {
    setInput(text);
    const result = parseNaturalLanguageTransaction(text, accounts, categories);
    setParsed(result);
  };

  // Speech Recognition (Web Speech API)
  const toggleSpeechRecognition = () => {
    if (isListening) {
      setIsListening(false);
      return;
    }

    const windowWithSpeech = window as unknown as {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const SpeechRecognition =
      windowWithSpeech.SpeechRecognition || windowWithSpeech.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error("Speech recognition is not supported in this browser. Please type your phrase.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "en-IN";
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
        toast.info("Listening... speak your transaction naturally");
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript) {
          handleInputChange(transcript);
          toast.success("Voice transcribed successfully!");
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
        toast.error("Could not capture audio. Please try typing.");
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch {
      setIsListening(false);
      toast.error("Voice input unavailable.");
    }
  };

  const handleConfirmAdd = () => {
    if (!parsed || parsed.amountMinor <= 0) {
      toast.error("Please enter a valid amount in your transaction sentence.");
      return;
    }

    if (!parsed.accountId) {
      toast.error("Please ensure an account is selected or specified.");
      return;
    }

    setSaving(true);
    try {
      fyzaStore.saveTransaction({
        account_id: parsed.accountId,
        type: parsed.type,
        amount: parsed.amountMinor,
        category_id: parsed.categoryId,
        description: parsed.description,
        transaction_date: parsed.transactionDate,
        merchant: parsed.merchant,
        notes: parsed.notes,
        tags: parsed.tags,
        transfer_account_id: parsed.transferAccountId,
      });

      toast.success(
        `Logged ₹${parsed.amountMajor.toLocaleString("en-IN")} (${parsed.description}) via Fyza AI! ✨`
      );
      onOpenChange(false);
      if (onSaved) onSaved();
    } catch {
      toast.error("Failed to save transaction.");
    } finally {
      setSaving(false);
    }
  };

  const handleOpenInStandardForm = () => {
    if (!parsed) return;
    onOpenChange(false);
    if (onOpenStandardForm) {
      onOpenStandardForm({
        type: parsed.type,
        amount: parsed.amountMinor,
        description: parsed.description,
        account_id: parsed.accountId || accounts[0]?.id || "",
        category_id: parsed.categoryId || undefined,
        merchant: parsed.merchant || undefined,
        transaction_date: parsed.transactionDate,
        transfer_account_id: parsed.transferAccountId || undefined,
        notes: parsed.notes || undefined,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 overflow-hidden border-border bg-card shadow-2xl rounded-2xl">
        {/* Glowing Top Banner */}
        <div className="bg-gradient-to-r from-primary/15 via-secondary/15 to-primary/10 border-b border-border/80 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-primary/20 text-primary flex items-center justify-center border border-primary/30 shadow-inner">
              <Sparkles className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <DialogTitle className="text-base font-extrabold text-foreground tracking-tight flex items-center gap-2">
                Fyza AI Natural Language
                <Badge variant="outline" className="border-primary/40 text-primary text-[10px] py-0 px-1.5 font-bold uppercase">
                  Zero Form Friction
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Type or speak in plain English. Fyza automatically parses amounts, accounts, dates, and categories.
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Natural Language Input Box */}
          <div className="relative">
            <textarea
              value={input}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="e.g. Spent 450 at Starbucks on coffee, or 15000 from Savings to Emergency..."
              rows={3}
              className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all resize-none font-medium leading-relaxed"
              autoFocus
            />
            <button
              type="button"
              onClick={toggleSpeechRecognition}
              className={`absolute right-3 bottom-3 h-8 w-8 rounded-lg flex items-center justify-center transition-all ${
                isListening
                  ? "bg-rose-500 text-white animate-pulse shadow-lg shadow-rose-500/30"
                  : "bg-surface-secondary text-muted-foreground hover:text-foreground hover:bg-surface-elevated"
              }`}
              title={isListening ? "Listening... click to stop" : "Voice input (Speak naturally)"}
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>
          </div>

          {/* Quick Prompts Carousel */}
          <div>
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">
              Try an example:
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              {EXAMPLE_PROMPTS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectExample(p.text)}
                  className="text-xs px-2.5 py-1 rounded-lg border border-border/80 bg-surface hover:bg-surface-elevated hover:border-primary/40 text-muted-foreground hover:text-foreground transition-all flex items-center gap-1 shadow-sm"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Live Parsing Preview */}
          {parsed && (
            <div className="rounded-xl border border-primary/25 bg-surface-secondary/60 p-4 space-y-3.5 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  AI Intelligence Extracted
                </span>
                <span className="text-[11px] font-semibold text-primary px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                  {parsed.confidence}% Confidence
                </span>
              </div>

              {/* Entity Badges Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {/* Amount */}
                <div className="p-2.5 rounded-lg bg-surface border border-border">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider block font-bold">
                    Amount
                  </span>
                  <span
                    className={`text-sm font-black mt-0.5 block ${
                      parsed.type === "expense"
                        ? "text-rose-400"
                        : parsed.type === "income"
                        ? "text-primary"
                        : "text-cyan-400"
                    }`}
                  >
                    {parsed.amountMajor > 0
                      ? formatCurrency(parsed.amountMinor)
                      : "Pending amount"}
                  </span>
                </div>

                {/* Type */}
                <div className="p-2.5 rounded-lg bg-surface border border-border">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider block font-bold">
                    Type
                  </span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-bold capitalize text-foreground">
                      {parsed.type}
                    </span>
                  </div>
                </div>

                {/* Category */}
                {parsed.type !== "transfer" && (
                  <div className="p-2.5 rounded-lg bg-surface border border-border">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider block font-bold">
                      Category
                    </span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Tag className="h-3.5 w-3.5 text-amber-400" />
                      <span className="text-xs font-bold text-foreground truncate">
                        {parsed.categoryName || "General Expense"}
                      </span>
                    </div>
                  </div>
                )}

                {/* Account / Source */}
                <div className="p-2.5 rounded-lg bg-surface border border-border">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider block font-bold">
                    {parsed.type === "transfer" ? "From Account" : "Account"}
                  </span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-bold text-foreground truncate">
                      {parsed.accountName || "Primary Account"}
                    </span>
                  </div>
                </div>

                {/* Transfer Destination */}
                {parsed.type === "transfer" && (
                  <div className="p-2.5 rounded-lg bg-surface border border-border">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider block font-bold">
                      To Account
                    </span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <ArrowRight className="h-3.5 w-3.5 text-cyan-400" />
                      <span className="text-xs font-bold text-cyan-400 truncate">
                        {parsed.transferAccountName || "Savings Reserve"}
                      </span>
                    </div>
                  </div>
                )}

                {/* Date */}
                <div className="p-2.5 rounded-lg bg-surface border border-border">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider block font-bold">
                    Date
                  </span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-bold text-foreground">
                      {parsed.transactionDate}
                    </span>
                  </div>
                </div>

                {/* Merchant (if found) */}
                {parsed.merchant && (
                  <div className="p-2.5 rounded-lg bg-surface border border-border">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider block font-bold">
                      Merchant
                    </span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Store className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs font-bold text-foreground truncate">
                        {parsed.merchant}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Description Preview */}
              <div className="text-xs text-muted-foreground pt-1 flex items-center justify-between border-t border-border/50">
                <span>
                  Recorded as: <strong className="text-foreground">{parsed.description}</strong>
                </span>
                {onOpenStandardForm && (
                  <button
                    type="button"
                    onClick={handleOpenInStandardForm}
                    className="text-xs text-primary hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Edit3 className="h-3 w-3" /> Edit in full form
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons Footer */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Cancel
            </Button>

            <div className="flex items-center gap-2">
              {parsed && onOpenStandardForm && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleOpenInStandardForm}
                  className="text-xs border-border text-foreground hover:bg-surface-elevated"
                >
                  Edit in Form
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                disabled={!parsed || parsed.amountMinor <= 0 || saving}
                onClick={handleConfirmAdd}
                className="bg-primary text-black font-extrabold hover:bg-primary/90 text-xs shadow-md shadow-primary/20 flex items-center gap-1.5"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    Log Transaction
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
