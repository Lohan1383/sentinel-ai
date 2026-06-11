"use client";

import { useEffect, useState } from "react";
import type { FeedEvent } from "@sentinel/shared";
import { fetchFeed } from "@/lib/api";
import { useLocationTracking } from "@/lib/use-location";
import { useRealtimeFeed } from "@/lib/use-realtime-feed";
import { FeedList } from "@/components/feed-list";
import { PageFrame } from "@/components/page-frame";

export default function FeedPage() {
  const { location } = useLocationTracking();
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useRealtimeFeed({
    onFeedUpdate: (next) => {
      setEvents((current) => {
        const merged = [...next, ...current];
        return merged.filter(
          (event, index, all) => index === all.findIndex((item) => item.id === event.id)
        );
      });
    }
  });

  useEffect(() => {
    let active = true;

    const load = async () => {
      const data = await fetchFeed(location.lat, location.lng, 60);
      if (active) {
        setEvents(data);
        setLoading(false);
      }
    };

    void load();
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        void load();
      }
    }, 30_000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [location.lat, location.lng]);

  return (
    <PageFrame>
      <section>
        <h2>Real-Time Event Feed</h2>
        <p className="muted">
          All entries are source-labeled as official, community, or AI-detected. Uncertain entries are marked.
        </p>
      </section>
      {loading ? <p>Loading events…</p> : <FeedList events={events} />}
    </PageFrame>
  );
}
