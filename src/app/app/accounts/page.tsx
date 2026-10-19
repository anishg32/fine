"use client";

import React, { useState, useEffect } from "react";
import {
  Wallet,
  Plus,
  Building2,
  PiggyBank,
  CreditCard,
  Banknote,
  Edit2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { calculateTotalBalance } from "@/lib/calculations";
import { formatCurrency, toMinorUnits, toMajorUnits } from "@/lib/utils";
import type { Account, AccountType } from "@/lib/types";
import { ACCOUNT_TYPES } from "@/lib/constants";
import { toast } from "sonner";

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("checking");
  const [balanceMajor, setBalanceMajor] = useState("");
  const [description, setDescription] = useState("");

  const loadData = () => {
    setAccounts(fyzaStore.getAccounts());
  };

  useEffect(() => {
    loadData();
    window.addEventListener("fyza_store_updated", loadData);
    return () => window.removeEventListener("fyza_store_updated", loadData);
  }, []);

  const totalNetBalance = calculateTotalBalance(accounts);

  const handleOpenAdd = () => {
    setEditingAccount(null);
    setName("");
    setType("checking");
    setBalanceMajor("0");
    setDescription("");
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (acc: Account) => {
    setEditingAccount(acc);
    setName(acc.name);
    setType(acc.type);
    setBalanceMajor(String(toMajorUnits(acc.current_balance)));
    setDescription(acc.description || "");
    setIsDialogOpen(true);
  };

  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    const balVal = parseFloat(balanceMajor) || 0;

    if (!name.trim()) {
      toast.error("Please enter an account name.");
      return;
    }

    fyzaStore.saveAccount({
      id: editingAccount?.id,
      name: name.trim(),
      type,
      currency: "INR",
      opening_balance: toMinorUnits(balVal),
      current_balance: toMinorUnits(balVal),
      description: description.trim() || null,
    });

    toast.success(editingAccount ? "Account updated." : "New account added.");
    setIsDialogOpen(false);
  };

  const handleDeleteAccount = (id: string) => {
    fyzaStore.deleteAccount(id);
    toast.success("Account removed.");
  };

  const getAccountIcon = (type: AccountType) => {
    switch (type) {
      case "savings":
        return PiggyBank;
      case "checking":
        return Building2;
      case "credit":
        return CreditCard;
      case "cash":
        return Banknote;
      default:
        return Wallet;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
            Accounts & Portfolios
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Track bank accounts, emergency funds, digital wallets, and credit lines.
          </p>
        </div>
        <Button
          onClick={handleOpenAdd}
          className="bg-primary text-black font-semibold hover:bg-primary/90 text-xs flex items-center gap-1.5 shadow-sm shadow-primary/20"
        >
          <Plus className="h-4 w-4" /> Add Account
        </Button>
      </div>

      {/* Net Worth Summary Banner */}
      <Card className="border-border bg-gradient-to-r from-card to-surface">
        <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">
              Total Combined Net Balance
            </p>
            <h3 className="text-3xl font-extrabold text-foreground mt-1">
              {formatCurrency(totalNetBalance, "INR")}
            </h3>
            <p className="text-xs text-emerald-400 font-medium mt-1">
              All accounts in INR (₹)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {accounts.length} Accounts Monitored
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Accounts Cards Grid */}
      {accounts.length === 0 ? (
        <Card className="border-dashed border-border/80 bg-surface/40 p-12 text-center">
          <div className="max-w-md mx-auto space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center">
              <Wallet className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-foreground">No accounts connected yet</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Add your primary savings bank, credit card, or cash wallet to start tracking accurate balances, net cash flow, and overall net worth.
            </p>
            <Button
              onClick={handleOpenAdd}
              size="sm"
              className="bg-primary text-black font-semibold hover:bg-primary/90 text-xs shadow-sm shadow-primary/20"
            >
              <Plus className="h-4 w-4 mr-1.5" /> Add Your First Account
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {accounts.map((acc) => {
            const Icon = getAccountIcon(acc.type);
            const isNegative = acc.current_balance < 0;

            return (
              <Card key={acc.id} className="hover:border-primary/40 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{
                          backgroundColor: acc.color ? `${acc.color}20` : "rgba(72, 214, 160, 0.15)",
                          color: acc.color || "#48D6A0",
                        }}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-base font-bold text-foreground">
                          {acc.name}
                        </CardTitle>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          {acc.type}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(acc)}
                        className="p-1 rounded text-muted-foreground hover:text-foreground"
                        title="Edit account"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteAccount(acc.id)}
                        className="p-1 rounded text-muted-foreground hover:text-destructive"
                        title="Delete account"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {acc.description && (
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {acc.description}
                    </p>
                  )}

                  <div className="pt-2 border-t border-border/60 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Current Balance</span>
                    <span
                      className={`text-lg font-bold ${
                        isNegative ? "text-rose-400" : "text-foreground"
                      }`}
                    >
                      {formatCurrency(acc.current_balance, acc.currency)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add / Edit Account Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingAccount ? "Edit Account" : "Add New Account"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveAccount} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Account Name</Label>
              <Input
                placeholder="e.g. HDFC Salary, ICICI Savings, Cash Wallet"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Account Type</Label>
                <Select value={type} onValueChange={(val: AccountType) => setType(val)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  {editingAccount ? "Current Balance (₹)" : "Starting Balance (₹)"}
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={balanceMajor}
                  onChange={(e) => setBalanceMajor(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Description (Optional)</Label>
              <Input
                placeholder="e.g. Primary salary account"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-primary text-black font-semibold hover:bg-primary/90">
                {editingAccount ? "Save Changes" : "Create Account"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
