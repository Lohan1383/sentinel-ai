"use client";

import { useEffect, useState } from "react";
import type { UserTier } from "@sentinel/shared";
import { config } from "./config";

const STORAGE_KEY = "sentinel-tier";

export function useTier() {
  const [tier, setTier] = useState<UserTier>(config.defaultTier);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as UserTier | null;
    if (stored && ["free", "plus", "family", "estate"].includes(stored)) {
      setTier(stored);
    }
  }, []);

  const updateTier = (next: UserTier) => {
    setTier(next);
    localStorage.setItem(STORAGE_KEY, next);
  };

  return { tier, updateTier };
}
