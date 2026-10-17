"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  PieChart,
  Target,
  Bot,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileNav({ onOpenAddTransaction }: { onOpenAddTransaction?: () => void }) {
  const pathname = usePathname();

  const NAV_ITEMS = [
    { label: "Overview", href: "/app", icon: LayoutDashboard },
    { label: "Activity", href: "/app/transactions", icon: ArrowLeftRight },
    { label: "Budgets", href: "/app/budgets", icon: PieChart },
    { label: "Goals", href: "/app/goals", icon: Target },
    { label: "AI", href: "/app/ai-assistant", icon: Bot },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border px-3 py-2 flex items-center justify-around">
      {NAV_ITEMS.slice(0, 2).map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center gap-1 py-1 px-3 text-[10px] font-medium transition-colors",
              isActive ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-5 w-5" />
            <span>{item.label}</span>
          </Link>
        );
      })}

      {/* Floating Center Add Button */}
      {onOpenAddTransaction && (
        <button
          onClick={onOpenAddTransaction}
          className="h-11 w-11 rounded-full bg-primary text-black flex items-center justify-center shadow-lg shadow-primary/30 -translate-y-3 active:scale-95 transition-transform"
          aria-label="Add transaction"
        >
          <Plus className="h-6 w-6 stroke-[2.5]" />
        </button>
      )}

      {NAV_ITEMS.slice(2).map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center gap-1 py-1 px-3 text-[10px] font-medium transition-colors",
              isActive ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-5 w-5" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
