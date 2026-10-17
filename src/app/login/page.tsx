"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Lock, Mail, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/providers/auth-provider";
import { toast } from "sonner";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/app";

  const { signIn, startDemoSession } = useAuth();

  const [email, setEmail] = useState("alex@fyza.finance");
  const [password, setPassword] = useState("FyzaDemo2026!");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await signIn(email, password);
      if (error) {
        toast.error(error);
        return;
      }
      toast.success("Welcome back to Fyza!");
      router.push(redirectUrl);
    } catch {
      toast.error("An unexpected error occurred during sign in.");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSignIn = () => {
    startDemoSession();
    toast.success("Signed in with Interactive Demo Account!");
    router.push(redirectUrl);
  };

  return (
    <div className="bg-card py-8 px-4 shadow-xl border border-border sm:rounded-2xl sm:px-10">
      {/* Quick Demo Access banner */}
      <div className="mb-6 p-4 rounded-xl bg-primary/10 border border-primary/20 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-xs font-bold text-foreground">Instant Interactive Demo</span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Explore the complete dashboard, test transactions, budgets, goals, and Fyza AI with pre-loaded realistic data.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleDemoSignIn}
          className="mt-1 w-full border-primary/30 text-primary hover:bg-primary/15 font-semibold text-xs flex items-center justify-center gap-1.5"
        >
          <span>Launch Demo Mode (1-Click)</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground font-semibold">
            Or Sign In with Credentials
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs text-muted-foreground">
            Email Address
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-xs text-muted-foreground">
              Password
            </Label>
            <Link
              href="/forgot-password"
              className="text-xs text-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="password"
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <Button
          type="submit"
          loading={loading}
          className="w-full bg-primary text-black font-semibold hover:bg-primary/90 mt-2"
        >
          Sign In
        </Button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative selection:bg-primary selection:text-black">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Home
        </Link>

        <div className="flex items-center gap-3 justify-center mb-6">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/20">
            <span className="font-extrabold text-black text-2xl">F</span>
          </div>
          <span className="font-bold text-2xl tracking-tight text-foreground">
            Fyza
          </span>
        </div>

        <h2 className="text-center text-2xl font-bold tracking-tight text-foreground">
          Sign in to your account
        </h2>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          Or{" "}
          <Link href="/signup" className="font-medium text-primary hover:underline">
            create a new account for free
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <Suspense fallback={<div className="h-64 rounded-2xl bg-card animate-pulse" />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
