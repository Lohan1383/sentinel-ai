import type { Coordinates, FeedEvent } from "@sentinel/shared";
import { buildEvent } from "./provider-utils.js";
import type { FeedProvider } from "./types.js";

export class CivilUnrestProvider implements FeedProvider {
  readonly name = "civil-unrest";

  async fetchEvents(location: Coordinates): Promise<FeedEvent[]> {
    return [
      buildEvent(location, {
        type: "civil_unrest",
        title: "Protest activity affecting arterial route",
        description:
          "Gathering reported near major corridor with intermittent traffic interruptions.",
        severity: "high",
        northOffsetMeters: -1500,
        eastOffsetMeters: -100,
        provider: "municipal-public-safety-feed",
        kind: "official",
        confidence: 0.76,
        minutesAgo: 80
      })
    ];
  }
}
