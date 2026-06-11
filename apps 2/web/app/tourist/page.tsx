"use client";

import { useEffect, useState } from "react";
import type { TouristPoi } from "@sentinel/shared";
import { fetchTouristPois } from "@/lib/api";
import { PageFrame } from "@/components/page-frame";
import { useLocationTracking } from "@/lib/use-location";
import { useTier } from "@/lib/use-tier";

export default function TouristPage() {
  const { location } = useLocationTracking();
  const { tier } = useTier();
  const [enabled, setEnabled] = useState(false);
  const [pois, setPois] = useState<TouristPoi[]>([]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const next = await fetchTouristPois(location.lat, location.lng, enabled, tier);
      if (active) {
        setPois(next);
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [location.lat, location.lng, enabled, tier]);

  return (
    <PageFrame>
      <section>
        <h2>Tourist Mode</h2>
        <p className="muted">
          Tourist phrasing is safety-first and avoids raw incident wording while still warning about risk zones.
        </p>
        <label className="switch-row" htmlFor="tourist-enabled">
          <input
            id="tourist-enabled"
            type="checkbox"
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
          />
          Enable Tourist Mode
        </label>
      </section>

      <section>
        <h3>Nearby Points of Interest</h3>
        {!enabled ? <p className="muted">Enable Tourist Mode to view nearby guidance.</p> : null}
        <ul className="poi-list">
          {pois.map((poi) => (
            <li key={poi.id} className={`poi-card risk-${poi.riskLevel.toLowerCase()}`}>
              <h4>{poi.name}</h4>
              <p>{poi.category}</p>
              <p>{poi.safetySummary}</p>
            </li>
          ))}
        </ul>
      </section>
    </PageFrame>
  );
}
