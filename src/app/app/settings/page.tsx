"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Bell,
  Download,
  Upload,
  RefreshCw,
  ShieldAlert,
  Palette,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useTheme } from "next-themes";
import { useAuth } from "@/components/providers/auth-provider";
import { fyzaStore } from "@/lib/store";
import { CURRENCIES, FYZA_THEMES } from "@/lib/constants";
import { toast } from "sonner";

export default function SettingsPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { profile, user, updateProfile, signOut, isDemoMode } = useAuth();
  const [mounted, setMounted] = useState(false);

  // Profile Form
  const [fullName, setFullName] = useState("");
  const [preferredCurrency, setPreferredCurrency] = useState("INR");
  const [locale, setLocale] = useState("en-IN");
  const [timezone, setTimezone] = useState("Asia/Kolkata");

  // Preferences Form
  const [budgetAlerts, setBudgetAlerts] = useState(true);
  const [goalMilestones, setGoalMilestones] = useState(true);
  const [recurringReminders, setRecurringReminders] = useState(true);

  // Dialog State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");

  const backupInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    if (profile) {
      setFullName(profile.full_name || "");
      setPreferredCurrency(profile.preferred_currency || "INR");
      setLocale(profile.locale || "en-IN");
      setTimezone(profile.timezone || "Asia/Kolkata");
    }
    const prefs = fyzaStore.getPreferences();
    setBudgetAlerts(prefs.budget_alerts);
    setGoalMilestones(prefs.goal_milestones);
    setRecurringReminders(prefs.recurring_reminders);
  }, [profile]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await updateProfile({
      full_name: fullName.trim(),
      preferred_currency: preferredCurrency,
      locale,
      timezone,
    });

    if (error) {
      toast.error(error);
    } else {
      toast.success("Profile preferences saved.");
    }
  };

  const handleSaveNotifications = () => {
    fyzaStore.updatePreferences({
      budget_alerts: budgetAlerts,
      goal_milestones: goalMilestones,
      recurring_reminders: recurringReminders,
    });
    toast.success("Notification preferences updated.");
  };

  const handleExportJSON = () => {
    const jsonStr = fyzaStore.exportData();
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `fyza_full_backup_${new Date().toISOString().split("T")[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Full financial backup downloaded.");
  };

  const handleRestoreJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = fyzaStore.importData(content);
      if (res.success) {
        toast.success("Backup restored successfully!");
        router.refresh();
      } else {
        toast.error(res.error || "Failed to parse backup file.");
      }
    };
    reader.readAsText(file);
    if (backupInputRef.current) backupInputRef.current.value = "";
  };

  const handleResetDemo = () => {
    fyzaStore.resetToDemo();
    toast.success("Reset to sample demo ledger.");
    router.refresh();
  };

  const handleConfirmDelete = async () => {
    if (deleteConfirmationText.toLowerCase() !== "delete my data") {
      toast.error("Please type 'delete my data' to confirm.");
      return;
    }
    fyzaStore.clearAllData();
    await signOut();
    toast.success("All personal records expunged. Account terminated.");
    router.push("/");
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Header */}
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
          Settings & Preferences
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Configure profile details, display currency, alerts, and backup portability.
        </p>
      </div>

      {/* Profile & Currency Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            Profile & Localization
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="fullname" className="text-xs text-muted-foreground">
                  Full Name
                </Label>
                <Input
                  id="fullname"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs text-muted-foreground">
                  Email Address
                </Label>
                <Input
                  id="email"
                  disabled
                  value={profile?.email || user?.email || (isDemoMode ? "alex@fyza.finance" : "")}
                  className="bg-surface/50 opacity-75"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Preferred Currency</Label>
                <Select value={preferredCurrency} onValueChange={setPreferredCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.name} ({c.symbol})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Timezone</Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST +5:30)</SelectItem>
                    <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                    <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                    <SelectItem value="Asia/Dubai">Asia/Dubai (GST +4:00)</SelectItem>
                    <SelectItem value="Asia/Singapore">Asia/Singapore (SGT +8:00)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button type="submit" size="sm" className="bg-primary text-black font-semibold hover:bg-primary/90">
              Save Profile Changes
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Theme Appearance — 5 Curated Themes */}
      <Card className="rounded-2xl border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Palette className="h-4 w-4 text-primary" />
            Appearance & Theming System
          </CardTitle>
          <CardDescription className="text-xs">
            Choose from 5 cohesive multi-colour themes. All charts, navigation, buttons, and dialogs dynamically follow your selected palette.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {FYZA_THEMES.map((t) => {
              const isSelected = mounted && theme === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setTheme(t.id);
                    toast.success(`Theme switched to ${t.name}`);
                  }}
                  className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between gap-3 transition-all duration-200 group relative overflow-hidden ${
                    isSelected
                      ? "border-primary bg-primary/10 shadow-md shadow-primary/10"
                      : "border-border bg-surface hover:bg-surface-elevated hover:border-border/80"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    {/* Visual Color Dots */}
                    <div className="flex items-center -space-x-1">
                      <span
                        className="h-4 w-4 rounded-full ring-2 ring-card shadow-sm"
                        style={{ backgroundColor: t.primaryColor }}
                      />
                      <span
                        className="h-3.5 w-3.5 rounded-full ring-2 ring-card opacity-90 shadow-sm"
                        style={{ backgroundColor: t.secondaryColor }}
                      />
                      <span
                        className="h-3 w-3 rounded-full ring-2 ring-card opacity-70 shadow-sm"
                        style={{ backgroundColor: t.bgColor }}
                      />
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-md bg-surface-secondary text-muted-foreground border border-border">
                        {t.isDark ? "Dark" : "Light"}
                      </span>
                      {isSelected && (
                        <span className="h-5 w-5 rounded-full bg-primary text-black flex items-center justify-center shrink-0">
                          <Check className="h-3 w-3 stroke-[3]" />
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="font-bold text-xs text-foreground group-hover:text-primary transition-colors">
                      {t.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                      {t.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Notifications Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            Notification Rules
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={budgetAlerts}
                onChange={(e) => setBudgetAlerts(e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <span className="text-xs font-medium text-foreground">
                Budget threshold alerts (Notify at 50%, 75%, 90%, 100% of limits)
              </span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={goalMilestones}
                onChange={(e) => setGoalMilestones(e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <span className="text-xs font-medium text-foreground">
                Savings goal milestones (Celebrate 50%, 75%, 100% completions)
              </span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={recurringReminders}
                onChange={(e) => setRecurringReminders(e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <span className="text-xs font-medium text-foreground">
                Upcoming recurring bills & SIP auto-debit reminders
              </span>
            </label>
          </div>

          <Button
            type="button"
            size="sm"
            onClick={handleSaveNotifications}
            variant="outline"
            className="text-xs"
          >
            Update Notification Preferences
          </Button>
        </CardContent>
      </Card>

      {/* Data Portability (Export & Restore) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Download className="h-4 w-4 text-primary" />
            Data Portability & Backup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            You own 100% of your financial information. Export full backups in JSON format or restore an existing ledger file.
          </p>
          <div className="flex items-center gap-3 flex-wrap pt-1">
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportJSON}
              className="text-xs flex items-center gap-1.5"
            >
              <Download className="h-3.5 w-3.5" /> Download Full JSON Backup
            </Button>

            <input
              type="file"
              accept=".json"
              ref={backupInputRef}
              onChange={handleRestoreJSON}
              className="hidden"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => backupInputRef.current?.click()}
              className="text-xs flex items-center gap-1.5"
            >
              <Upload className="h-3.5 w-3.5" /> Restore Backup File
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={handleResetDemo}
              className="text-xs flex items-center gap-1.5 text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Reset Demo Data
              {isDemoMode && (
                <Badge variant="outline" className="ml-1 text-[9px] py-0 px-1 text-amber-400 border-amber-500/40">
                  Active Demo
                </Badge>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-rose-500/30 bg-rose-500/5">
        <CardHeader>
          <CardTitle className="text-base font-bold text-rose-400 flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-rose-400" />
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Permanently delete your account and all associated transaction records, accounts, budgets, and savings goals. This action cannot be reversed.
          </p>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setIsDeleteModalOpen(true)}
            className="text-xs"
          >
            Delete Account & Purge Data
          </Button>
        </CardContent>
      </Card>

      {/* Account Deletion Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" />
              Confirm Irreversible Deletion
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs text-muted-foreground">
            <p>
              This will permanently expunge all tracked accounts, budgets, and transactions from our active database.
            </p>
            <p>
              To confirm, please type <span className="font-bold text-foreground font-mono">delete my data</span> below:
            </p>
            <Input
              value={deleteConfirmationText}
              onChange={(e) => setDeleteConfirmationText(e.target.value)}
              placeholder="delete my data"
              className="text-xs"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteConfirmationText.toLowerCase() !== "delete my data"}
            >
              Permanently Terminate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
