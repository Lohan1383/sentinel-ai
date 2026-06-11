"use client";

import type { PropsWithChildren } from "react";
import { AppShell } from "./app-shell";
import { useTier } from "@/lib/use-tier";

export function PageFrame({ children }: PropsWithChildren) {
  const { tier, updateTier } = useTier();
  return (
    <AppShell tier={tier} onTierChange={updateTier}>
      {children}
    </AppShell>
  );
}
