import type {
  Alert,
  DashboardSnapshot,
  FeedEvent,
  GeofenceZone,
  IncidentAssessment,
  IncidentUploadInput,
  NetworkStatus,
  PowerStatus
} from "@sentinel/shared";
import { distanceMeters } from "../domain/geo.js";

interface StoredIncident {
  id: string;
  input: IncidentUploadInput;
  assessment: IncidentAssessment;
  publishedEvent?: FeedEvent;
}

function locationKey(lat: number, lng: number): string {
  return `${lat.toFixed(3)}:${lng.toFixed(3)}`;
}

export class InMemoryStore {
  private feedEvents: FeedEvent[] = [];
  private activeAlerts: Alert[] = [];
  private latestPower: PowerStatus | null = null;
  private latestNetwork: NetworkStatus | null = null;
  private snapshots = new Map<string, DashboardSnapshot>();
  private geofenceZones: GeofenceZone[] = [];
  private incidents: StoredIncident[] = [];

  saveSignals(events: FeedEvent[], power: PowerStatus, network: NetworkStatus): void {
    const combined = [...events, ...this.feedEvents];
    this.feedEvents = combined
      .filter(
        (event, index, all) =>
          index ===
          all.findIndex(
            (candidate) =>
              candidate.title === event.title &&
              Math.abs(new Date(candidate.occurredAt).getTime() - new Date(event.occurredAt).getTime()) <
                30 * 60_000
          )
      )
      .sort((a, b) => Number(new Date(b.occurredAt)) - Number(new Date(a.occurredAt)))
      .slice(0, 300);

    this.latestPower = power;
    this.latestNetwork = network;
  }

  getFeed(lat: number, lng: number, limit = 60): FeedEvent[] {
    return this.feedEvents
      .map((event) => ({
        ...event,
        distanceMeters: Math.round(distanceMeters(event.location, { lat, lng }))
      }))
      .sort((a, b) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0))
      .slice(0, limit);
  }

  getRawFeed(limit = 120): FeedEvent[] {
    return this.feedEvents.slice(0, limit);
  }

  getPower(): PowerStatus | null {
    return this.latestPower;
  }

  getNetwork(): NetworkStatus | null {
    return this.latestNetwork;
  }

  saveAlerts(alerts: Alert[]): void {
    this.activeAlerts = alerts
      .sort((a, b) => Number(new Date(b.createdAt)) - Number(new Date(a.createdAt)))
      .slice(0, 120);
  }

  getAlerts(): Alert[] {
    return this.activeAlerts;
  }

  saveSnapshot(snapshot: DashboardSnapshot): void {
    this.snapshots.set(locationKey(snapshot.location.lat, snapshot.location.lng), snapshot);
  }

  getSnapshot(lat: number, lng: number): DashboardSnapshot | null {
    return this.snapshots.get(locationKey(lat, lng)) ?? null;
  }

  saveGeofenceZones(zones: GeofenceZone[]): void {
    this.geofenceZones = zones;
  }

  getGeofenceZones(): GeofenceZone[] {
    return this.geofenceZones;
  }

  addIncident(record: StoredIncident): void {
    this.incidents.unshift(record);
    this.incidents = this.incidents.slice(0, 400);

    if (record.publishedEvent) {
      this.feedEvents.unshift(record.publishedEvent);
      this.feedEvents = this.feedEvents.slice(0, 320);
    }
  }

  listIncidents(): StoredIncident[] {
    return this.incidents;
  }
}
