import type { Coordinates, TouristPoi } from "@sentinel/shared";
import type { TouristProvider } from "./types.js";
import { jitterLocation } from "../../domain/geo.js";

export class TouristPoiProvider implements TouristProvider {
  readonly name = "tourist-pois";

  async fetchPois(location: Coordinates): Promise<TouristPoi[]> {
    return [
      {
        id: "poi-1",
        name: "City Cultural Market",
        category: "attraction",
        location: jitterLocation(location, 700, 350),
        safetySummary:
          "Busy area. Keep valuables secured and prefer daylight visits for lower risk.",
        riskLevel: "YELLOW"
      },
      {
        id: "poi-2",
        name: "Central Transit Hub",
        category: "transport",
        location: jitterLocation(location, -1200, 240),
        safetySummary:
          "Peak-time crowding. Use designated pickup zones and avoid isolated exits at night.",
        riskLevel: "ORANGE"
      },
      {
        id: "poi-3",
        name: "Waterfront Promenade",
        category: "attraction",
        location: jitterLocation(location, 450, -900),
        safetySummary:
          "Generally active and monitored. Maintain standard awareness after dark.",
        riskLevel: "GREEN"
      }
    ];
  }
}
