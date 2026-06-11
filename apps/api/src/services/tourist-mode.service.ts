import type { GeoPoint, PointOfInterest, RiskEvent } from "@sentinel/shared";
import { defaultCityFromLocation, poiSeedForCity } from "../utils/sample-data";

function sanitizeCrimeLanguage(input: string): string {
  return input
    .replace(/armed robbery/gi, "safety concern")
    .replace(/robbery/gi, "safety risk")
    .replace(/crime/gi, "safety")
    .replace(/violent/gi, "high-risk");
}

export class TouristModeService {
  rewriteEvents(events: RiskEvent[]): RiskEvent[] {
    return events.map((event) => {
      if (event.type !== "crime_alert" && event.type !== "civil_unrest") {
        return event;
      }

      return {
        ...event,
        title: sanitizeCrimeLanguage(`Safety advisory: ${event.title}`),
        summary: sanitizeCrimeLanguage(event.summary)
      };
    });
  }

  getOverlay(location: GeoPoint): PointOfInterest[] {
    const city = defaultCityFromLocation(location);
    return poiSeedForCity(city);
  }
}
