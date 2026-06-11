import type { Coordinates, FeedEvent } from "@sentinel/shared";
import { buildEvent } from "./provider-utils.js";
import type { FeedProvider } from "./types.js";

export class TransportDisruptionProvider implements FeedProvider {
  readonly name = "transport";

  async fetchEvents(location: Coordinates): Promise<FeedEvent[]> {
    return [
      buildEvent(location, {
        type: "transport",
        title: "Road disruption due to collision response",
        description:
          "Emergency response causing lane closure and slow traffic movement.",
        severity: "medium",
        northOffsetMeters: 250,
        eastOffsetMeters: 1500,
        provider: "transport-ops-feed",
        kind: "official",
        confidence: 0.82,
        minutesAgo: 22
      })
    ];
  }
}
