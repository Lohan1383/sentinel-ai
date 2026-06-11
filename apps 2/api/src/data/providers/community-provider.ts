import type { Coordinates, FeedEvent } from "@sentinel/shared";
import { buildEvent } from "./provider-utils.js";
import type { FeedProvider } from "./types.js";

export class CommunityReportsProvider implements FeedProvider {
  readonly name = "community-reports";

  async fetchEvents(location: Coordinates): Promise<FeedEvent[]> {
    return [
      buildEvent(location, {
        type: "community",
        title: "Community report: suspicious activity near fuel station",
        description:
          "Single user-submitted sighting. Awaiting independent corroboration.",
        severity: "low",
        northOffsetMeters: -400,
        eastOffsetMeters: 300,
        provider: "sentinel-community",
        kind: "community",
        confidence: 0.55,
        minutesAgo: 28,
        uncertaintyReason: "Unverified single-source report."
      })
    ];
  }
}
