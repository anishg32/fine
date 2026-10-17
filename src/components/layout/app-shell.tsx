"use client";

import React, { useState } from "react";
import { AppSidebar } from "./app-sidebar";
import { AppHeader } from "./app-header";
import { MobileNav } from "./mobile-nav";
import { TransactionDialog } from "@/components/transactions/transaction-dialog";
import { AINaturalLanguageDialog } from "@/components/transactions/ai-natural-language-dialog";
import type { Transaction } from "@/lib/types";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [isAddTxOpen, setIsAddTxOpen] = useState(false);
  const [isAiTxOpen, setIsAiTxOpen] = useState(false);
  const [prefilledTx, setPrefilledTx] = useState<Partial<Transaction> | null>(null);

  const handleOpenAi = () => {
    setIsAiTxOpen(true);
  };

  const handleOpenStandardWithPrefill = (prefilled: Partial<Transaction>) => {
    setPrefilledTx(prefilled);
    setIsAddTxOpen(true);
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground antialiased selection:bg-primary selection:text-black">
      {/* Desktop Navigation Sidebar */}
      <AppSidebar />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0 pb-16 md:pb-0">
        <AppHeader
          onOpenAddTransaction={() => {
            setPrefilledTx(null);
            setIsAddTxOpen(true);
          }}
          onOpenAiTransaction={handleOpenAi}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto animate-fade-in">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav
        onOpenAddTransaction={() => {
          setPrefilledTx(null);
          setIsAddTxOpen(true);
        }}
      />

      {/* Global Quick Add Transaction Dialog */}
      <TransactionDialog
        open={isAddTxOpen}
        onOpenChange={(open) => {
          setIsAddTxOpen(open);
          if (!open) setPrefilledTx(null);
        }}
        prefilled={prefilledTx}
        onSaved={() => {
          // Handled via store event
        }}
      />

      {/* Global AI Natural Language Quick Add Dialog */}
      <AINaturalLanguageDialog
        open={isAiTxOpen}
        onOpenChange={setIsAiTxOpen}
        onOpenStandardForm={handleOpenStandardWithPrefill}
      />
    </div>
  );
}
