"use client";

import { useEffect, useMemo, useState } from "react";
import type { DashboardSnapshot } from "@sentinel/shared";
import { DASHBOARD_AUTO_REFRESH_MS } from "@sentinel/shared";
import { fetchDashboard } from "./api";

export function useDashboard(lat: number, lng: number) {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const next = await fetchDashboard(lat, lng);
        if (mounted) {
          setSnapshot(next);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Dashboard fetch failed");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void load();

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        void load();
      }
    }, DASHBOARD_AUTO_REFRESH_MS);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [lat, lng]);

  return useMemo(
    () => ({ snapshot, loading, error, setSnapshot }),
    [snapshot, loading, error]
  );
}
