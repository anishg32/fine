import React from "react";
import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";

export default function PrivacyPage() {
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
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-foreground">Privacy Policy</h1>
            <p className="text-xs text-muted-foreground">Effective Date: October 2026</p>
          </div>
        </div>

        <div className="space-y-6 text-sm text-muted-foreground leading-relaxed border-t border-border pt-6">
          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">1. Our Core Privacy Philosophy</h2>
            <p>
              Fyza is built on the fundamental principle that your personal financial records belong strictly to you. We do not sell your personal data, monetize your transaction history to ad brokers, or train public AI models on your private financial records.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">2. Data We Collect and Store</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Account Credentials:</strong> Email address and encrypted password hashes managed via Supabase Auth.</li>
              <li><strong>Financial Ledger Entries:</strong> Manually inputted or CSV-imported account names, balances, transaction records, budget caps, and savings goals.</li>
              <li><strong>User Preferences:</strong> Display currency, locale, dark/light theme, and notification thresholds.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">3. What We Never Ask For</h2>
            <p>
              Fyza will never request, store, or transmit your online banking login credentials, payment card CVV numbers, ATM PINs, or One-Time Passwords (OTPs).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">4. Row Level Security & Encryption</h2>
            <p>
              All user records stored in our cloud backend are enforced by PostgreSQL Row Level Security (RLS) policies. Even within the database, records owned by user A cannot be accessed by user B. Communications are encrypted in transit using TLS 1.3.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">5. Data Portability and Deletion</h2>
            <p>
              You maintain 100% data portability. You can export your entire financial history in standard JSON or CSV format at any time from the Settings page. You can also trigger immediate, irreversible account deletion which cascades across all your records.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
