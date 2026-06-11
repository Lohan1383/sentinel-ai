"use client";

import { useEffect, useMemo, useState } from "react";
import type { Alert, FeedEvent } from "@sentinel/shared";
import { checkGeofence, fetchFeed } from "@/lib/api";
import { useDashboard } from "@/lib/use-dashboard";
import { useLocationTracking } from "@/lib/use-location";
import { useRealtimeFeed } from "@/lib/use-realtime-feed";
import { useTier } from "@/lib/use-tier";
import { AlertsPanel } from "@/components/alerts-panel";
import { FeedList } from "@/components/feed-list";
import { GateNote } from "@/components/gate-note";
import { PageFrame } from "@/components/page-frame";
import { RiskCard } from "@/components/risk-card";

function NetworkSummary({ snapshot }: { snapshot: NonNullable<ReturnType<typeof useDashboard>["snapshot"]> }) {
  const mobileDown = snapshot.network.mobile.filter((provider) => provider.status !== "online").length;
  const fibreDown = snapshot.network.fibre.filter((provider) => provider.status !== "online").length;

  return (
    <div className="status-grid">
      <article>
        <h3>Load Shedding</h3>
        <p>
          Stage {snapshot.power.stage} · {snapshot.power.unexpectedOutage ? "Unexpected outage active" : "Scheduled"}
        </p>
      </article>
      <article>
        <h3>Mobile Networks</h3>
        <p>{mobileDown === 0 ? "Stable" : `${mobileDown} providers impacted`}</p>
      </article>
      <article>
        <h3>Fibre Networks</h3>
        <p>{fibreDown === 0 ? "Stable" : `${fibreDown} providers impacted`}</p>
      </article>
    </div>
  );
}

export default function HomePage() {
  const { tier } = useTier();
  const { location, motion, locationError } = useLocationTracking();
  const { snapshot, loading, error, setSnapshot } = useDashboard(location.lat, location.lng);
  const [feed, setFeed] = useState<FeedEvent[]>([]);
  const [backgroundAlerts, setBackgroundAlerts] = useState<Alert[]>([]);

  useRealtimeFeed({
    onFeedUpdate: setFeed,
    onAlertsUpdate: (alerts) => {
      setSnapshot((prev) => (prev ? { ...prev, activeAlerts: alerts } : prev));
    },
    onGeofenceAlert: setBackgroundAlerts
  });

  useEffect(() => {
    let active = true;
    const loadFeed = async () => {
      const items = await fetchFeed(location.lat, location.lng, 20);
      if (active) {
        setFeed(items);
      }
    };

    void loadFeed();
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadFeed();
      }
    }, 30_000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [location.lat, location.lng]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState !== "visible") {
        return;
      }

      void checkGeofence({
        lat: location.lat,
        lng: location.lng,
        heading: motion.heading,
        speed: motion.speed,
        tier
      }).then((result) => {
        if (result.alerts.length === 0) {
          return;
        }

        if (navigator.vibrate) {
          navigator.vibrate([120, 80, 120]);
        }

        if (Notification.permission === "granted") {
          const primary = result.alerts[0];
          new Notification(primary.title, {
            body: primary.body,
            tag: "sentinel-geofence"
          });
        }
      });
    }, 45_000);

    return () => clearInterval(interval);
  }, [location.lat, location.lng, motion.heading, motion.speed, tier]);

  const locationText = useMemo(
    () => `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`,
    [location.lat, location.lng]
  );

  return (
    <PageFrame>
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Current Location</p>
          <h2>{locationText}</h2>
          {locationError ? <p className="error">Location issue: {locationError}</p> : null}
        </div>
        <div>
          <p className="eyebrow">Movement</p>
          <p>
            Heading {Math.round(motion.heading)}° · {motion.speed.toFixed(1)} m/s
          </p>
        </div>
      </section>

      {loading ? <p>Loading dashboard…</p> : null}
      {error ? <p className="error">{error}</p> : null}

      {snapshot ? (
        <>
          <RiskCard risk={snapshot.risk} />
          <NetworkSummary snapshot={snapshot} />
          <AlertsPanel alerts={[...backgroundAlerts, ...snapshot.activeAlerts].slice(0, 12)} />
          <GateNote tier={tier} feature="advanced_geofencing" />
          <section>
            <h2>Live Area Feed</h2>
            <FeedList events={feed.slice(0, 12)} />
          </section>
        </>
      ) : null}
    </PageFrame>
  );
}
