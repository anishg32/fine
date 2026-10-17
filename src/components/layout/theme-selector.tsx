"use client";

import React, { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Palette, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FYZA_THEMES, type FyzaTheme } from "@/lib/constants";
import { toast } from "sonner";

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-9 w-9 rounded-lg border border-border bg-surface flex items-center justify-center text-muted-foreground">
        <Palette className="h-4 w-4" />
      </div>
    );
  }

  const currentTheme = FYZA_THEMES.find((t) => t.id === theme) || FYZA_THEMES[0];

  const handleSelectTheme = (themeId: FyzaTheme, name: string) => {
    setTheme(themeId);
    toast.success(`Theme updated to ${name}`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="h-9 px-2.5 rounded-lg border border-border bg-surface hover:bg-surface-elevated text-xs font-medium text-foreground flex items-center gap-2 transition-colors"
          title="Select theme palette"
          aria-label="Theme selector"
        >
          <span
            className="h-3 w-3 rounded-full ring-1 ring-white/20 shrink-0"
            style={{ backgroundColor: currentTheme.primaryColor }}
          />
          <span className="hidden xl:inline text-xs truncate max-w-[100px]">
            {currentTheme.name}
          </span>
          <Palette className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 p-1.5">
        <DropdownMenuLabel className="text-xs font-semibold px-2 py-1.5 text-muted-foreground uppercase tracking-wider">
          Color Palette & Style
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="space-y-1 py-1">
          {FYZA_THEMES.map((t) => {
            const isSelected = theme === t.id;
            return (
              <DropdownMenuItem
                key={t.id}
                onClick={() => handleSelectTheme(t.id, t.name)}
                className={`flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer transition-colors ${
                  isSelected ? "bg-primary/10 text-foreground font-semibold" : "hover:bg-surface"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center -space-x-1">
                    <span
                      className="h-3.5 w-3.5 rounded-full ring-1 ring-background"
                      style={{ backgroundColor: t.primaryColor }}
                    />
                    <span
                      className="h-3 w-3 rounded-full ring-1 ring-background opacity-80"
                      style={{ backgroundColor: t.secondaryColor }}
                    />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-medium leading-none text-foreground">
                      {t.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground mt-0.5 leading-none">
                      {t.isDark ? "Dark" : "Light"} • {t.description.split("&")[0].trim()}
                    </span>
                  </div>
                </div>
                {isSelected && <Check className="h-3.5 w-3.5 text-primary ml-2 shrink-0" />}
              </DropdownMenuItem>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
