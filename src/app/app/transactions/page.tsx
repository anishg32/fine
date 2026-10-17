"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  Trash2,
  Edit2,
  Calendar,
  ArrowUpDown,
  Tag,
  CreditCard,
  Building2,
  X,
  CheckCircle2,
  AlertTriangle,
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { TransactionDialog } from "@/components/transactions/transaction-dialog";
import { fyzaStore } from "@/lib/store";
import { formatCurrency, toMinorUnits, toMajorUnits } from "@/lib/utils";
import type { Transaction, Account, Category, TransactionType } from "@/lib/types";
import { toast } from "sonner";

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Dialog states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [deletingTx, setDeletingTx] = useState<Transaction | null>(null);

  // CSV Import state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<Array<Partial<Transaction>>>([]);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [accountFilter, setAccountFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date-desc" | "date-asc" | "amount-desc" | "amount-asc">("date-desc");

  const loadData = () => {
    setTransactions(fyzaStore.getTransactions());
    setAccounts(fyzaStore.getAccounts());
    setCategories(fyzaStore.getCategories());
  };

  useEffect(() => {
    loadData();
    window.addEventListener("fyza_store_updated", loadData);
    return () => window.removeEventListener("fyza_store_updated", loadData);
  }, []);

  // Filtered & Sorted transactions
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((tx) => {
        // Search
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const matchDesc = tx.description.toLowerCase().includes(q);
          const matchMerchant = tx.merchant?.toLowerCase().includes(q);
          const matchTags = tx.tags?.some((t) => t.toLowerCase().includes(q));
          if (!matchDesc && !matchMerchant && !matchTags) return false;
        }

        // Type
        if (typeFilter !== "all" && tx.type !== typeFilter) return false;

        // Category
        if (categoryFilter !== "all" && tx.category_id !== categoryFilter) return false;

        // Account
        if (accountFilter !== "all" && tx.account_id !== accountFilter) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "date-desc") return b.transaction_date.localeCompare(a.transaction_date);
        if (sortBy === "date-asc") return a.transaction_date.localeCompare(b.transaction_date);
        if (sortBy === "amount-desc") return b.amount - a.amount;
        if (sortBy === "amount-asc") return a.amount - b.amount;
        return 0;
      });
  }, [transactions, searchQuery, typeFilter, categoryFilter, accountFilter, sortBy]);

  // Actions
  const handleEdit = (tx: Transaction) => {
    setEditingTx(tx);
    setIsDialogOpen(true);
  };

  const handleDelete = () => {
    if (!deletingTx) return;
    fyzaStore.deleteTransaction(deletingTx.id);
    toast.success("Transaction deleted and balance adjusted.");
    setDeletingTx(null);
  };

  // CSV Export
  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) {
      toast.error("No transactions to export.");
      return;
    }

    const headers = [
      "Date",
      "Type",
      "Description",
      "Amount",
      "Currency",
      "Account",
      "Category",
      "Merchant",
      "Notes",
    ];

    const rows = filteredTransactions.map((tx) => [
      `"${tx.transaction_date}"`,
      `"${tx.type}"`,
      `"${tx.description.replace(/"/g, '""')}"`,
      (tx.amount / 100).toFixed(2),
      `"${tx.currency}"`,
      `"${tx.account?.name || ""}"`,
      `"${tx.category?.name || ""}"`,
      `"${(tx.merchant || "").replace(/"/g, '""')}"`,
      `"${(tx.notes || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `fyza_transactions_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Transactions exported as CSV.");
  };

  // CSV Import Handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n").filter((l) => l.trim().length > 0);
      if (lines.length < 2) {
        toast.error("CSV file is empty or missing headers.");
        return;
      }

      const defaultAcc = accounts[0]?.id || "acc-1";
      const parsed: Array<Partial<Transaction>> = [];

      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(",").map((p) => p.replace(/^"|"$/g, "").trim());
        if (parts.length >= 4) {
          const date = parts[0] || new Date().toISOString().split("T")[0];
          const rawType = (parts[1] || "expense").toLowerCase();
          const type: TransactionType =
            rawType === "income" ? "income" : rawType === "transfer" ? "transfer" : "expense";
          const desc = parts[2] || "Imported Transaction";
          const amountMajor = parseFloat(parts[3]) || 0;

          if (amountMajor > 0) {
            parsed.push({
              transaction_date: date,
              type,
              description: desc,
              amount: toMinorUnits(amountMajor),
              account_id: defaultAcc,
              merchant: parts[7] || null,
            });
          }
        }
      }

      setImportPreview(parsed);
      setIsImportModalOpen(true);
    };

    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleConfirmImport = () => {
    setImporting(true);
    try {
      importPreview.forEach((item) => {
        fyzaStore.saveTransaction({
          account_id: item.account_id || accounts[0]?.id || "acc-1",
          type: item.type || "expense",
          amount: item.amount || 10000,
          description: item.description || "Imported Entry",
          transaction_date: item.transaction_date || new Date().toISOString().split("T")[0],
          merchant: item.merchant || null,
        });
      });
      toast.success(`Successfully imported ${importPreview.length} transactions.`);
      setIsImportModalOpen(false);
      setImportPreview([]);
    } catch {
      toast.error("Failed to import transactions.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
            Transaction Activity
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Audit, categorize, and export your personal ledger records.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="file"
            accept=".csv"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="text-xs flex items-center gap-1.5"
          >
            <Upload className="h-3.5 w-3.5" /> Import CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="text-xs flex items-center gap-1.5"
          >
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setEditingTx(null);
              setIsDialogOpen(true);
            }}
            className="bg-primary text-black font-semibold hover:bg-primary/90 text-xs flex items-center gap-1.5 shadow-sm shadow-primary/20"
          >
            <Plus className="h-3.5 w-3.5" /> Add Transaction
          </Button>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            {/* Search Input */}
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search description, merchant, tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            {/* Type Filter */}
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
              </SelectContent>
            </Select>

            {/* Account Filter */}
            <Select value={accountFilter} onValueChange={setAccountFilter}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="All Accounts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Accounts</SelectItem>
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sort Filter */}
            <Select value={sortBy} onValueChange={(val: "date-desc" | "date-asc" | "amount-desc" | "amount-asc") => setSortBy(val)}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date-desc">Newest First</SelectItem>
                <SelectItem value="date-asc">Oldest First</SelectItem>
                <SelectItem value="amount-desc">Highest Amount</SelectItem>
                <SelectItem value="amount-asc">Lowest Amount</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Ledger Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border bg-surface/50 text-muted-foreground font-semibold">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 hidden sm:table-cell">Account</th>
                  <th className="py-3 px-4 hidden md:table-cell">Category</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted-foreground">
                      No transactions match your current search or filters.
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx) => {
                    const isIncome = tx.type === "income";
                    const isTransfer = tx.type === "transfer";

                    return (
                      <tr
                        key={tx.id}
                        className="hover:bg-surface-secondary/40 transition-colors group"
                      >
                        <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                          {tx.transaction_date}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-foreground truncate max-w-xs">
                            {tx.description}
                          </div>
                          {tx.merchant && (
                            <div className="text-[10px] text-muted-foreground truncate">
                              {tx.merchant}
                            </div>
                          )}
                          {tx.tags && tx.tags.length > 0 && (
                            <div className="flex gap-1 mt-0.5">
                              {tx.tags.map((t, idx) => (
                                <span
                                  key={idx}
                                  className="text-[9px] px-1 py-0.2 rounded bg-surface border border-border text-muted-foreground"
                                >
                                  #{t}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 hidden sm:table-cell text-muted-foreground">
                          {tx.account?.name || "Account"}
                        </td>
                        <td className="py-3 px-4 hidden md:table-cell">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-medium bg-surface border border-border">
                            {tx.category?.name || (isTransfer ? "Transfer" : "General")}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-bold whitespace-nowrap">
                          <span
                            className={
                              isIncome
                                ? "text-emerald-400"
                                : isTransfer
                                ? "text-cyan-400"
                                : "text-rose-400"
                            }
                          >
                            {isIncome ? "+" : isTransfer ? "⇄ " : "-"}
                            {formatCurrency(tx.amount, tx.currency || "INR")}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleEdit(tx)}
                              className="p-1 rounded hover:bg-surface text-muted-foreground hover:text-foreground"
                              title="Edit transaction"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setDeletingTx(tx)}
                              className="p-1 rounded hover:bg-surface text-muted-foreground hover:text-destructive"
                              title="Delete transaction"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Transaction Edit/Create Dialog */}
      <TransactionDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        transaction={editingTx}
      />

      {/* Delete Confirmation Dialog */}
      {deletingTx && (
        <Dialog open={Boolean(deletingTx)} onOpenChange={() => setDeletingTx(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Confirm Deletion
              </DialogTitle>
            </DialogHeader>
            <div className="text-sm text-muted-foreground py-2">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground">
                &quot;{deletingTx.description}&quot;
              </span>{" "}
              for{" "}
              <span className="font-semibold text-foreground">
                {formatCurrency(deletingTx.amount, deletingTx.currency || "INR")}
              </span>
              ? This will atomically reverse its balance adjustment on your account.
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeletingTx(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                Delete Entry
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* CSV Import Preview Modal */}
      {isImportModalOpen && (
        <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
          <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Import Transactions Preview</DialogTitle>
            </DialogHeader>
            <p className="text-xs text-muted-foreground">
              Reviewing {importPreview.length} validated records from your CSV file.
            </p>
            <div className="border border-border rounded-lg max-h-60 overflow-y-auto mt-2">
              <table className="w-full text-xs text-left">
                <thead className="bg-surface border-b border-border text-muted-foreground">
                  <tr>
                    <th className="p-2">Date</th>
                    <th className="p-2">Type</th>
                    <th className="p-2">Description</th>
                    <th className="p-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {importPreview.map((item, idx) => (
                    <tr key={idx}>
                      <td className="p-2">{item.transaction_date}</td>
                      <td className="p-2 capitalize">{item.type}</td>
                      <td className="p-2 font-medium">{item.description}</td>
                      <td className="p-2 text-right">
                        {formatCurrency(item.amount || 0, "INR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setIsImportModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleConfirmImport}
                loading={importing}
                className="bg-primary text-black font-semibold hover:bg-primary/90"
              >
                Import All Records
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
