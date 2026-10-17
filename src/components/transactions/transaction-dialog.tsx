"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fyzaStore } from "@/lib/store";
import { toMinorUnits, toMajorUnits } from "@/lib/utils";
import { parseNaturalLanguageTransaction } from "@/lib/ai-nlp";
import { Sparkles } from "lucide-react";
import type { Account, Category, Transaction, TransactionType } from "@/lib/types";
import { toast } from "sonner";

interface TransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: Transaction | null;
  prefilled?: Partial<Transaction> | null;
  onSaved?: () => void;
}

export function TransactionDialog({
  open,
  onOpenChange,
  transaction,
  prefilled,
  onSaved,
}: TransactionDialogProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [type, setType] = useState<TransactionType>("expense");
  const [accountId, setAccountId] = useState("");
  const [transferAccountId, setTransferAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [description, setDescription] = useState("");
  const [merchant, setMerchant] = useState("");
  const [transactionDate, setTransactionDate] = useState("2026-10-14");
  const [notes, setNotes] = useState("");
  const [tagsStr, setTagsStr] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");

  useEffect(() => {
    if (open) {
      const accs = fyzaStore.getAccounts();
      const cats = fyzaStore.getCategories();
      setAccounts(accs);
      setCategories(cats);
      setAiPrompt("");

      if (transaction) {
        setType(transaction.type);
        setAccountId(transaction.account_id);
        setTransferAccountId(transaction.transfer_account_id || "");
        setCategoryId(transaction.category_id || "");
        setAmountStr(String(toMajorUnits(transaction.amount)));
        setDescription(transaction.description);
        setMerchant(transaction.merchant || "");
        setTransactionDate(transaction.transaction_date);
        setNotes(transaction.notes || "");
        setTagsStr((transaction.tags || []).join(", "));
        setIsRecurring(transaction.is_recurring || false);
      } else if (prefilled) {
        setType(prefilled.type || "expense");
        setAccountId(prefilled.account_id || accs[0]?.id || "");
        setTransferAccountId(prefilled.transfer_account_id || accs[1]?.id || "");
        setCategoryId(prefilled.category_id || cats[0]?.id || "");
        setAmountStr(prefilled.amount ? String(toMajorUnits(prefilled.amount)) : "");
        setDescription(prefilled.description || "");
        setMerchant(prefilled.merchant || "");
        setTransactionDate(prefilled.transaction_date || new Date().toISOString().split("T")[0]);
        setNotes(prefilled.notes || "");
        setTagsStr((prefilled.tags || []).join(", "));
        setIsRecurring(prefilled.is_recurring || false);
      } else {
        // Reset defaults
        setType("expense");
        setAccountId(accs[0]?.id || "");
        setTransferAccountId(accs[1]?.id || "");
        const defaultCat = cats.find((c) => c.type === "expense");
        setCategoryId(defaultCat?.id || "");
        setAmountStr("");
        setDescription("");
        setMerchant("");
        setTransactionDate(new Date().toISOString().split("T")[0]);
        setNotes("");
        setTagsStr("");
        setIsRecurring(false);
      }
    }
  }, [open, transaction, prefilled]);

  const handleAiFill = () => {
    if (!aiPrompt.trim()) return;
    const result = parseNaturalLanguageTransaction(aiPrompt, accounts, categories);
    setType(result.type);
    if (result.amountMajor > 0) setAmountStr(String(result.amountMajor));
    if (result.description) setDescription(result.description);
    if (result.merchant) setMerchant(result.merchant);
    if (result.accountId) setAccountId(result.accountId);
    if (result.type === "transfer" && result.transferAccountId) {
      setTransferAccountId(result.transferAccountId);
    } else if (result.categoryId) {
      setCategoryId(result.categoryId);
    }
    if (result.transactionDate) setTransactionDate(result.transactionDate);
    if (result.notes) setNotes(result.notes);
    if (result.tags.length > 0) setTagsStr(result.tags.join(", "));
    toast.success(`Form populated with AI: "${result.description}" (${result.confidence}% confidence) ✨`);
    setAiPrompt("");
  };

  const filteredCategories = categories.filter((c) => c.type === type);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(amountStr);

    if (isNaN(amountVal) || amountVal <= 0) {
      toast.error("Please enter a valid amount greater than zero.");
      return;
    }

    if (!accountId) {
      toast.error("Please select an account.");
      return;
    }

    if (type === "transfer" && (!transferAccountId || transferAccountId === accountId)) {
      toast.error("Please select a different destination account for the transfer.");
      return;
    }

    if (!description.trim()) {
      toast.error("Please enter a description.");
      return;
    }

    setSubmitting(true);

    try {
      const tags = tagsStr
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      fyzaStore.saveTransaction({
        id: transaction?.id,
        account_id: accountId,
        type,
        amount: toMinorUnits(amountVal),
        category_id: type === "transfer" ? null : categoryId || null,
        description: description.trim(),
        transaction_date: transactionDate,
        merchant: merchant.trim() || null,
        notes: notes.trim() || null,
        tags,
        is_recurring: isRecurring,
        transfer_account_id: type === "transfer" ? transferAccountId : null,
      });

      toast.success(
        transaction
          ? "Transaction updated successfully."
          : "Transaction added successfully."
      );
      onOpenChange(false);
      if (onSaved) onSaved();
    } catch {
      toast.error("An error occurred while saving the transaction.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {transaction ? "Edit Transaction" : "New Transaction"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* AI Natural Language Quick Fill (for new transactions) */}
          {!transaction && (
            <div className="p-3 rounded-xl bg-gradient-to-r from-primary/10 via-surface to-primary/5 border border-primary/25 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-primary flex items-center gap-1.5 uppercase tracking-wider">
                  <Sparkles className="h-3.5 w-3.5" />
                  AI Natural Language Quick-Fill
                </span>
                <span className="text-[10px] text-muted-foreground">Press Enter to fill</span>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="e.g. Spent 450 at Starbucks on coffee..."
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAiFill();
                    }
                  }}
                  className="h-8 text-xs bg-surface border-border"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAiFill}
                  disabled={!aiPrompt.trim()}
                  className="h-8 px-2.5 text-xs bg-primary text-black font-bold hover:bg-primary/90 shrink-0"
                >
                  Auto-Fill
                </Button>
              </div>
            </div>
          )}

          {/* Transaction Type Tabs */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Type</Label>
            <Tabs
              value={type}
              onValueChange={(val) => {
                const newType = val as TransactionType;
                setType(newType);
                const matchingCat = categories.find((c) => c.type === newType);
                if (matchingCat) setCategoryId(matchingCat.id);
              }}
              className="w-full"
            >
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="expense" className="data-[state=active]:text-rose-400">
                  Expense
                </TabsTrigger>
                <TabsTrigger value="income" className="data-[state=active]:text-primary">
                  Income
                </TabsTrigger>
                <TabsTrigger value="transfer" className="data-[state=active]:text-cyan-400">
                  Transfer
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Amount Input */}
          <div className="space-y-1.5">
            <Label htmlFor="amount" className="text-xs text-muted-foreground">
              Amount (₹)
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-muted-foreground text-sm font-semibold">
                ₹
              </span>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="pl-8 text-lg font-bold"
                required
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-xs text-muted-foreground">
              Description
            </Label>
            <Input
              id="description"
              placeholder="e.g. Swiggy dinner, Monthly salary"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          {/* Account Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                {type === "transfer" ? "From Account" : "Account"}
              </Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* If transfer: Destination Account. If income/expense: Category */}
            {type === "transfer" ? (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">To Account</Label>
                <Select value={transferAccountId} onValueChange={setTransferAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Destination" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts
                      .filter((a) => a.id !== accountId)
                      .map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Category</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Date & Merchant */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="date" className="text-xs text-muted-foreground">
                Date
              </Label>
              <Input
                id="date"
                type="date"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="merchant" className="text-xs text-muted-foreground">
                Merchant / Source (Optional)
              </Label>
              <Input
                id="merchant"
                placeholder="e.g. Amazon, Blinkit"
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
              />
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <Label htmlFor="tags" className="text-xs text-muted-foreground">
              Tags (comma-separated)
            </Label>
            <Input
              id="tags"
              placeholder="e.g. vacation, food, essentials"
              value={tagsStr}
              onChange={(e) => setTagsStr(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-xs text-muted-foreground">
              Notes (Optional)
            </Label>
            <Textarea
              id="notes"
              placeholder="Additional details..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-16"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={submitting}
              className="bg-primary text-black font-semibold hover:bg-primary/90"
            >
              {transaction ? "Update Transaction" : "Save Transaction"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
