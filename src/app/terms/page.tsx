import React from "react";
import Link from "next/link";
import { ArrowLeft, Scale } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground py-16 px-4 sm:px-6 lg:px-8 selection:bg-primary selection:text-black">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Home
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
            <Scale className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-foreground">Terms of Service</h1>
            <p className="text-xs text-muted-foreground">Effective Date: October 2026</p>
          </div>
        </div>

        <div className="space-y-6 text-sm text-muted-foreground leading-relaxed border-t border-border pt-6">
          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">1. Financial Software Disclaimer</h2>
            <p>
              Fyza is a personal finance organization, analysis, and forecasting software tool. Fyza is not a registered investment advisor, bank, broker-dealer, or tax consultancy. The information and analytics provided by the platform, including forecasts and Fyza AI responses, are for informational purposes only.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">2. No Guaranteed Outcomes</h2>
            <p>
              Financial forecasts, savings targets, and health scores are mathematical models based on historical entries and assumptions you provide. Future inflation, market returns, income changes, and unexpected expenses cannot be predicted with certainty. Never base critical real estate, legal, or investment decisions solely on automated estimates.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">3. User Responsibility for Accuracy</h2>
            <p>
              Because Fyza allows manual account tracking and user-imported CSV records, the integrity of dashboard summaries depends directly on the accuracy of data you record or import.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">4. Termination and Data Removal</h2>
            <p>
              You may terminate your account at any time. Upon deletion, all your transactions, budgets, goals, and account balances will be permanently expunged from our active database.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
