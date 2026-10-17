"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters long.");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast.success("Password updated successfully. Please sign in.");
      router.push("/login");
    }, 800);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign In
        </Link>
        <h2 className="text-center text-2xl font-bold tracking-tight text-foreground">
          Create new password
        </h2>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          Enter a strong, secure password for your account.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-card py-8 px-4 shadow-xl border border-border sm:rounded-2xl sm:px-10">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs text-muted-foreground">
                New Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  required
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-xs text-muted-foreground">
                Confirm New Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type="password"
                  required
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <Button
              type="submit"
              loading={loading}
              className="w-full bg-primary text-black font-semibold hover:bg-primary/90 mt-2"
            >
              Update Password
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
