import type { Coordinates, FeedEvent } from "@sentinel/shared";
import type { FeedProvider } from "./types.js";
import { buildEvent } from "./provider-utils.js";

export class WeatherRiskProvider implements FeedProvider {
  readonly name = "weather-risk";

  async fetchEvents(location: Coordinates): Promise<FeedEvent[]> {
    const month = new Date().getMonth() + 1;
    const isStormSeason = month >= 10 || month <= 3;

    if (!isStormSeason) {
      return [];
    }

    return [
      buildEvent(location, {
        type: "weather",
        title: "Severe thunderstorm advisory",
        description:
          "Localized severe thunderstorm risk with short-duration flooding potential on low-lying roads.",
        severity: "medium",
        northOffsetMeters: 1200,
        eastOffsetMeters: 700,
        provider: "weather-service",
        kind: "official",
        confidence: 0.79,
        minutesAgo: 40,
        uncertaintyReason:
          "Storm-cell movement is dynamic; exact neighborhood impact may shift quickly."
      })
    ];
  }
}
