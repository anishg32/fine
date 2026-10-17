"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/providers/auth-provider";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await resetPassword(email);
      if (error) {
        toast.error(error);
        return;
      }
      setSubmitted(true);
      toast.success("Password reset instructions sent.");
    } catch {
      toast.error("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
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
          Reset your password
        </h2>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          Enter your email and we&apos;ll send you a recovery link.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-card py-8 px-4 shadow-xl border border-border sm:rounded-2xl sm:px-10">
          {submitted ? (
            <div className="text-center space-y-4">
              <div className="mx-auto h-12 w-12 rounded-full bg-primary/15 text-primary flex items-center justify-center">
                <CheckCircle className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Check your inbox</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                If an account exists for {email}, a recovery link has been sent. Check your spam folder if it doesn&apos;t arrive in 2 minutes.
              </p>
              <Link href="/login" className="block pt-2">
                <Button variant="outline" className="w-full">
                  Return to Sign In
                </Button>
              </Link>
            </div>
          ) : (
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

              <Button
                type="submit"
                loading={loading}
                className="w-full bg-primary text-black font-semibold hover:bg-primary/90 mt-2"
              >
                Send Recovery Link
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
