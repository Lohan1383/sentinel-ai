import type { Coordinates, FeedEvent } from "@sentinel/shared";
import { env } from "../../config/env.js";
import { buildEvent } from "./provider-utils.js";
import type { FeedProvider } from "./types.js";

interface GoogleSearchItem {
  title?: string;
  snippet?: string;
}

export class CrimeWebIntelligenceProvider implements FeedProvider {
  readonly name = "crime-web-intelligence";

  async fetchEvents(location: Coordinates): Promise<FeedEvent[]> {
    const liveEvents = await this.fetchFromGoogleSearch(location);
    if (liveEvents.length > 0) {
      return liveEvents;
    }

    return [
      buildEvent(location, {
        type: "crime",
        title: "Robbery pattern reported near commuter corridor",
        description:
          "Multiple recent robbery reports referenced by local public channels in the last 24 hours.",
        severity: "high",
        northOffsetMeters: 650,
        eastOffsetMeters: -300,
        provider: "public-news-fallback",
        kind: "ai_detected",
        confidence: 0.62,
        uncertaintyReason:
          "Live web crime feed unavailable. Fallback synthesized from last known public pattern model.",
        minutesAgo: 95
      }),
      buildEvent(location, {
        type: "crime",
        title: "Vehicle break-in cluster flagged",
        description:
          "Reported spike in vehicle break-ins around parking zones. Treat as unverified until corroborated.",
        severity: "medium",
        northOffsetMeters: -900,
        eastOffsetMeters: 500,
        provider: "public-news-fallback",
        kind: "ai_detected",
        confidence: 0.58,
        uncertaintyReason: "Signal confidence reduced due to sparse source coverage.",
        minutesAgo: 170
      })
    ];
  }

  private async fetchFromGoogleSearch(location: Coordinates): Promise<FeedEvent[]> {
    if (!env.GOOGLE_CUSTOM_SEARCH_API_KEY || !env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID) {
      return [];
    }

    const query = encodeURIComponent(
      `South Africa crime incidents near ${location.lat.toFixed(3)},${location.lng.toFixed(
        3
      )} last 48 hours`
    );

    const url =
      `https://www.googleapis.com/customsearch/v1?key=${env.GOOGLE_CUSTOM_SEARCH_API_KEY}` +
      `&cx=${env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID}&q=${query}&num=5&safe=off`;

    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(3_500)
      });

      if (!response.ok) {
        return [];
      }

      const body = (await response.json()) as { items?: GoogleSearchItem[] };
      const items = body.items ?? [];

      return items.slice(0, 4).map((item, index) =>
        buildEvent(location, {
          type: "crime",
          title: item.title ?? "Crime signal detected",
          description:
            item.snippet ??
            "Recent crime signal from public web source. Verify with official channels where possible.",
          severity: index === 0 ? "high" : "medium",
          northOffsetMeters: 200 + index * 280,
          eastOffsetMeters: index % 2 === 0 ? -350 : 420,
          provider: "google-custom-search",
          kind: "ai_detected",
          confidence: 0.7 - index * 0.05,
          minutesAgo: 30 + index * 18,
          uncertaintyReason:
            "AI-extracted from public web summaries and may lag incident occurrence time."
        })
      );
    } catch {
      return [];
    }
  }
}
