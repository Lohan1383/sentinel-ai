import dayjs from "dayjs";
import type { GeoPoint, RiskEvent } from "@sentinel/shared";
import { SignalAdapter } from "../adapters/signal-adapters";

export class EventAggregatorService {
  constructor(private readonly adapters: SignalAdapter[]) {}

  async getEvents(location: GeoPoint, radiusKm: number, now = new Date()): Promise<RiskEvent[]> {
    const responses = await Promise.all(
      this.adapters.map((adapter) =>
        adapter.fetchEvents({
          location,
          radiusKm,
          now
        })
      )
    );

    const deduped = new Map<string, RiskEvent>();
    for (const event of responses.flat()) {
      const existing = deduped.get(event.id);
      if (!existing || dayjs(event.occurredAt).isAfter(dayjs(existing.occurredAt))) {
        deduped.set(event.id, event);
      }
    }

    return [...deduped.values()].sort((a, b) => dayjs(b.occurredAt).valueOf() - dayjs(a.occurredAt).valueOf());
  }
}
