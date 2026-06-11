import dayjs from "dayjs";
import type { GeoPoint, RiskEvent } from "@sentinel/shared";
import { severityWeight } from "@sentinel/shared";

export interface CrimeIntelligenceResult {
  factor: number;
  recencyWeightedIncidentCount: number;
  notes: string[];
}

export class CrimeIntelligenceService {
  evaluate(_location: GeoPoint, events: RiskEvent[], now = new Date()): CrimeIntelligenceResult {
    const crimeEvents = events.filter((event) => event.type === "crime_alert");

    let factor = 0;
    let recencyWeightedIncidentCount = 0;

    for (const event of crimeEvents) {
      const ageHours = Math.max(0.25, dayjs(now).diff(dayjs(event.occurredAt), "hour", true));
      const recencyWeight = 1 / Math.min(ageHours, 12);
      recencyWeightedIncidentCount += recencyWeight;
      factor += (severityWeight[event.severity] / 2.4) * recencyWeight;
    }

    return {
      factor: Math.min(35, Number(factor.toFixed(2))),
      recencyWeightedIncidentCount: Number(recencyWeightedIncidentCount.toFixed(2)),
      notes: [
        "Crime intelligence in V1 is read-only context and does not predict future incidents.",
        "Web/news ingestion latency can affect exact recency.",
        `Signals evaluated: ${crimeEvents.length}`
      ]
    };
  }
}
