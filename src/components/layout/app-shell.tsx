"use client";

import React, { useState } from "react";
import { AppSidebar } from "./app-sidebar";
import { AppHeader } from "./app-header";
import { MobileNav } from "./mobile-nav";
import { TransactionDialog } from "@/components/transactions/transaction-dialog";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [isAddTxOpen, setIsAddTxOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background text-foreground antialiased selection:bg-primary selection:text-black">
      {/* Desktop Navigation Sidebar */}
      <AppSidebar />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0 pb-16 md:pb-0">
        <AppHeader onOpenAddTransaction={() => setIsAddTxOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto animate-fade-in">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav onOpenAddTransaction={() => setIsAddTxOpen(true)} />

      {/* Global Quick Add Transaction Dialog */}
      <TransactionDialog
        open={isAddTxOpen}
        onOpenChange={setIsAddTxOpen}
        onSaved={() => {
          // Handled via store event
        }}
      />
    </div>
  );
}
