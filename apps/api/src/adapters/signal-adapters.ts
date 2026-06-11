import dayjs from "dayjs";
import type { GeoPoint, RiskEvent } from "@sentinel/shared";
import { distanceKm } from "@sentinel/shared";
import { buildSeedEvents } from "../utils/sample-data";

export interface AdapterContext {
  location: GeoPoint;
  radiusKm: number;
  now: Date;
}

export interface SignalAdapter {
  id: string;
  fetchEvents(context: AdapterContext): Promise<RiskEvent[]>;
}

export class SeedSignalAdapter implements SignalAdapter {
  public readonly id = "seed-signal-adapter";

  async fetchEvents(context: AdapterContext): Promise<RiskEvent[]> {
    const staleCutoff = dayjs(context.now).subtract(24, "hour");
    return buildSeedEvents(context.now)
      .filter((event) => {
        const occurredAt = dayjs(event.occurredAt);
        if (occurredAt.isBefore(staleCutoff)) {
          return false;
        }

        return distanceKm(context.location, event.location) <= context.radiusKm;
      })
      .map((event) => ({
        ...event,
        distanceKm: Number(distanceKm(context.location, event.location).toFixed(2))
      }));
  }
}
