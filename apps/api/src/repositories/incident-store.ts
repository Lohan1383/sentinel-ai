import type { GeoPoint, RiskEvent } from "@sentinel/shared";

export interface IncidentStore {
  add(event: RiskEvent): void;
  listAll(): RiskEvent[];
  listNearby(location: GeoPoint, maxDeltaDegrees: number): RiskEvent[];
}

export class InMemoryIncidentStore implements IncidentStore {
  private readonly events: RiskEvent[] = [];

  add(event: RiskEvent): void {
    this.events.unshift(event);
    this.events.splice(300);
  }

  listAll(): RiskEvent[] {
    return [...this.events];
  }

  listNearby(location: GeoPoint, maxDeltaDegrees: number): RiskEvent[] {
    return this.events.filter((event) => {
      const latDiff = Math.abs(event.location.lat - location.lat);
      const lngDiff = Math.abs(event.location.lng - location.lng);
      return latDiff <= maxDeltaDegrees && lngDiff <= maxDeltaDegrees;
    });
  }
}
