"use client";

import React, { useEffect } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { fyzaStore } from "@/lib/store";

export default function ProtectedAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    fyzaStore.init();
  }, []);

  return <AppShell>{children}</AppShell>;
}
