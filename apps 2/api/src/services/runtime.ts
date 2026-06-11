import { randomUUID } from "node:crypto";
import { SA_DEFAULT_CENTER, canAccessFeature, sourceWithUncertainty } from "@sentinel/shared";
import type {
  Alert,
  Coordinates,
  FeedEvent,
  IncidentAssessment,
  IncidentUploadInput,
  TouristPoi,
  UserTier
} from "@sentinel/shared";
import { feedProviders, networkProvider, powerProvider, touristProvider } from "../data/providers/index.js";
import { deriveAlerts } from "../domain/alert-engine.js";
import { buildDynamicZones, evaluateGeofenceEntry } from "../domain/geofence-engine.js";
import {
  assessIncidentAuthenticity,
  incidentToFeedEvent
} from "../domain/incident-authenticity.js";
import { buildDashboardSnapshot } from "../domain/risk-engine.js";
import { InMemoryStore } from "../store/in-memory-store.js";
import { RealtimeHub } from "./realtime-hub.js";

function infrastructureEvents(
  location: Coordinates,
  power: Awaited<ReturnType<typeof powerProvider.fetchPowerStatus>>,
  network: Awaited<ReturnType<typeof networkProvider.fetchNetworkStatus>>
): FeedEvent[] {
  const events: FeedEvent[] = [];

  if (power.stage > 0) {
    events.push({
      id: randomUUID(),
      type: "power",
      title: `Load shedding stage ${power.stage}`,
      description: `Scheduled load shedding active for area ${power.area}.`,
      severity: power.stage >= 4 ? "high" : "medium",
      occurredAt: new Date().toISOString(),
      location,
      source: power.source,
      verified: true
    });
  }

  if (power.unexpectedOutage) {
    events.push({
      id: randomUUID(),
      type: "power",
      title: "Unexpected outage report",
      description: "Unexpected local outage reported. Awaiting utility confirmation.",
      severity: "high",
      occurredAt: new Date().toISOString(),
      location,
      source: sourceWithUncertainty(
        "power-crowd-overlay",
        "community",
        0.68,
        "Derived from community signals until official utility update arrives."
      ),
      verified: false
    });
  }

  for (const provider of [...network.mobile, ...network.fibre]) {
    if (provider.status === "online") {
      continue;
    }
    events.push({
      id: randomUUID(),
      type: "network",
      title: `${provider.provider} ${provider.status}`,
      description:
        provider.status === "offline"
          ? "Provider outage detected in current area."
          : "Provider instability detected in current area.",
      severity: provider.status === "offline" ? "high" : "medium",
      occurredAt: new Date().toISOString(),
      location,
      source: provider.source,
      verified: provider.source.confidence >= 0.72
    });
  }

  return events;
}

export class SentinelRuntime {
  private readonly refreshIntervalMs = 60_000;
  private intervalRef?: NodeJS.Timeout;

  constructor(
    private readonly store: InMemoryStore,
    private readonly hub: RealtimeHub,
    private readonly incidentThreshold: number
  ) {}

  async bootstrap(): Promise<void> {
    await this.refreshSignals(SA_DEFAULT_CENTER);
    this.intervalRef = setInterval(() => {
      void this.refreshSignals(SA_DEFAULT_CENTER);
    }, this.refreshIntervalMs);
  }

  async refreshSignals(location: Coordinates) {
    const fetched = await Promise.all(
      feedProviders.map(async (provider) => {
        try {
          return await provider.fetchEvents(location);
        } catch {
          return [];
        }
      })
    );

    const [power, network] = await Promise.all([
      powerProvider.fetchPowerStatus(location),
      networkProvider.fetchNetworkStatus(location)
    ]);

    const feed = [...fetched.flat(), ...infrastructureEvents(location, power, network)];

    this.store.saveSignals(feed, power, network);
    const allFeed = this.store.getRawFeed(120);
    const alerts = deriveAlerts({ feed: allFeed, power, network });
    this.store.saveAlerts(alerts);

    const zones = buildDynamicZones({ feed: allFeed, power, network });
    this.store.saveGeofenceZones(zones);

    const snapshot = buildDashboardSnapshot({
      location,
      feed: this.store.getFeed(location.lat, location.lng, 80),
      power,
      network,
      alerts
    });

    this.store.saveSnapshot(snapshot);

    this.hub.broadcast("feed_update", {
      events: this.store.getFeed(location.lat, location.lng, 40)
    });
    this.hub.broadcast("alerts_update", {
      alerts: alerts.slice(0, 12)
    });

    return snapshot;
  }

  async getDashboard(location: Coordinates) {
    const existing = this.store.getSnapshot(location.lat, location.lng);
    if (existing) {
      return existing;
    }

    return this.refreshSignals(location);
  }

  async getFeed(location: Coordinates, limit = 60): Promise<FeedEvent[]> {
    if (this.store.getRawFeed(1).length === 0) {
      await this.refreshSignals(location);
    }
    return this.store.getFeed(location.lat, location.lng, limit);
  }

  async checkGeofence(params: {
    location: Coordinates;
    headingDegrees: number;
    speedMps: number;
    tier: UserTier;
  }): Promise<Alert[]> {
    if (this.store.getGeofenceZones().length === 0) {
      await this.refreshSignals(params.location);
    }

    const alerts = evaluateGeofenceEntry({
      location: params.location,
      headingDegrees: params.headingDegrees,
      speedMps: params.speedMps,
      zones: this.store.getGeofenceZones(),
      tier: params.tier
    });

    if (alerts.length > 0) {
      this.hub.broadcast("geofence_alert", { alerts });
    }

    return alerts;
  }

  async reportIncident(incident: IncidentUploadInput): Promise<{
    assessment: IncidentAssessment;
    published: boolean;
  }> {
    const existing = this.store.listIncidents().map((record) => record.input);
    const nearbyEvents = this.store.getFeed(incident.location.lat, incident.location.lng, 50);

    const assessment = assessIncidentAuthenticity({
      incident,
      existingIncidents: existing,
      nearbyEvents,
      threshold: this.incidentThreshold
    });

    const event = incidentToFeedEvent(incident, assessment);

    this.store.addIncident({
      id: randomUUID(),
      input: incident,
      assessment,
      publishedEvent: assessment.shouldPublish ? event : undefined
    });

    if (assessment.shouldPublish) {
      this.hub.broadcast("feed_update", {
        events: await this.getFeed(incident.location, 40)
      });
    }

    return {
      assessment,
      published: assessment.shouldPublish
    };
  }

  async getTouristPois(location: Coordinates, tier: UserTier): Promise<TouristPoi[]> {
    const pois = await touristProvider.fetchPois(location);

    if (canAccessFeature(tier, "tourist_mode_extended")) {
      return pois;
    }

    return pois.slice(0, 2).map((poi) => ({
      ...poi,
      safetySummary: poi.safetySummary.replace(/crime|robbery|scam/gi, "safety concern")
    }));
  }

  async getPower(location: Coordinates) {
    const power = this.store.getPower();
    if (power) {
      return power;
    }
    await this.refreshSignals(location);
    return this.store.getPower();
  }

  async getNetwork(location: Coordinates) {
    const network = this.store.getNetwork();
    if (network) {
      return network;
    }
    await this.refreshSignals(location);
    return this.store.getNetwork();
  }

  getPermissionExplanations() {
    return {
      locationForeground:
        "Used to calculate local risk, feed distance, and area-specific service disruptions.",
      locationBackground:
        "Used for pre-entry danger alerts while moving, including when your phone is locked.",
      notifications:
        "Used to deliver urgent safety, infrastructure, and environmental alerts in real time.",
      motionActivity:
        "Optional. Improves route-direction accuracy for geofence warning timing.",
      cameraUploadOnly:
        "Used only when you submit an incident report image. No continuous capture is performed."
    };
  }

  dispose(): void {
    if (this.intervalRef) {
      clearInterval(this.intervalRef);
    }
  }
}
