"use client";

import Link from "next/link";
import type { PropsWithChildren } from "react";
import type { UserTier } from "@sentinel/shared";

interface AppShellProps extends PropsWithChildren {
  tier: UserTier;
  onTierChange: (tier: UserTier) => void;
}

export function AppShell({ children, tier, onTierChange }: AppShellProps) {
  return (
    <div className="app-shell">
      <header className="top-bar">
        <div>
          <p className="eyebrow">Sentinel V1</p>
          <h1>Live Safety + Infrastructure Intelligence</h1>
        </div>

        <label className="tier-select" htmlFor="tier-select">
          Plan
          <select
            id="tier-select"
            value={tier}
            onChange={(event) => onTierChange(event.target.value as UserTier)}
          >
            <option value="free">Free</option>
            <option value="plus">Plus</option>
            <option value="family">Family</option>
            <option value="estate">Estate</option>
          </select>
        </label>
      </header>

      <nav className="main-nav" aria-label="Primary navigation">
        <Link href="/">Dashboard</Link>
        <Link href="/feed">Live Feed</Link>
        <Link href="/report">Report Incident</Link>
        <Link href="/tourist">Tourist Mode</Link>
        <Link href="/onboarding">Permissions</Link>
      </nav>

      <main>{children}</main>
    </div>
  );
}
