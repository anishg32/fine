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

  const { signIn, signInWithGoogle, startDemoSession } = useAuth();

  const [email, setEmail] = useState("alex@fyza.finance");
  const [password, setPassword] = useState("FyzaDemo2026!");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  React.useEffect(() => {
    if (searchParams.get("error") === "auth_callback_failed") {
      toast.error("Google authentication failed. Please try again.");
    }
  }, [searchParams]);

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

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        toast.error(error);
      }
    } catch {
      toast.error("Failed to connect to Google authentication.");
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleDemoSignIn = () => {
    startDemoSession();
    toast.success("Signed in with Interactive Demo Account!");
    router.push(redirectUrl);
  };

  return (
    <div className="bg-card py-8 px-4 shadow-xl border border-border sm:rounded-2xl sm:px-10">
      {/* Google Sign-In Primary Button */}
      <Button
        type="button"
        variant="outline"
        onClick={handleGoogleSignIn}
        loading={googleLoading}
        className="w-full h-11 border-border bg-surface hover:bg-surface-elevated text-foreground font-semibold text-xs flex items-center justify-center gap-3 rounded-xl transition-all shadow-sm"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
        <span>Continue with Google</span>
      </Button>

      {/* Quick Demo Access banner */}
      <div className="mt-4 p-4 rounded-xl bg-primary/10 border border-primary/20 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-xs font-bold text-foreground">Interactive Demo Mode</span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Test transactions, budgets, goals, and financial assistant with sample records without logging in.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleDemoSignIn}
          className="mt-1 w-full border-primary/30 text-primary hover:bg-primary/15 font-semibold text-xs flex items-center justify-center gap-1.5"
        >
          <span>Launch Demo Mode</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="relative my-5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground font-semibold">
            Or Sign In with Email
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
