"use client";

import { useEffect, useRef } from "react";
import type { Alert, FeedEvent } from "@sentinel/shared";
import { config } from "./config";

interface Handlers {
  onFeedUpdate?: (events: FeedEvent[]) => void;
  onAlertsUpdate?: (alerts: Alert[]) => void;
  onGeofenceAlert?: (alerts: Alert[]) => void;
}

export function useRealtimeFeed(handlers: Handlers): void {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const ws = new WebSocket(config.wsUrl);

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as {
          type: string;
          payload: { events?: FeedEvent[]; alerts?: Alert[] };
        };

        if (message.type === "feed_update") {
          handlersRef.current.onFeedUpdate?.(message.payload.events ?? []);
        }

        if (message.type === "alerts_update") {
          handlersRef.current.onAlertsUpdate?.(message.payload.alerts ?? []);
        }

        if (message.type === "geofence_alert") {
          handlersRef.current.onGeofenceAlert?.(message.payload.alerts ?? []);
        }
      } catch {
        // Ignore malformed payloads from unexpected clients.
      }
    };

    return () => {
      ws.close();
    };
  }, []);
}
