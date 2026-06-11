import { randomUUID } from "node:crypto";
import { canAccessFeature, sourceWithUncertainty } from "@sentinel/shared";
import type {
  Alert,
  Coordinates,
  FeedEvent,
  GeofenceZone,
  NetworkStatus,
  PowerStatus,
  UserTier
} from "@sentinel/shared";
import { distanceMeters, projectPoint } from "./geo.js";

function radiusForSeverity(severity: FeedEvent["severity"]): number {
  switch (severity) {
    case "critical":
      return 1_600;
    case "high":
      return 1_200;
    case "medium":
      return 800;
    case "low":
      return 500;
    default:
      return 500;
  }
}

export function buildDynamicZones(params: {
  feed: FeedEvent[];
  power: PowerStatus;
  network: NetworkStatus;
}): GeofenceZone[] {
  const zones: GeofenceZone[] = params.feed
    .filter((event) => event.type === "crime" || event.type === "civil_unrest")
    .slice(0, 15)
    .map((event) => ({
      id: `zone-${event.id}`,
      name: event.title,
      center: event.location,
      radiusMeters: radiusForSeverity(event.severity),
      riskColor: event.severity === "critical" ? "RED" : event.severity === "high" ? "ORANGE" : "YELLOW",
      reason: event.description,
      source: event.source
    }));

  const degraded = [...params.network.mobile, ...params.network.fibre].filter(
    (provider) => provider.status !== "online"
  );

  if (params.power.unexpectedOutage && degraded.length >= 2) {
    zones.push({
      id: randomUUID(),
      name: "Infrastructure blind spot",
      center: {
        lat: params.feed[0]?.location.lat ?? -26.2,
        lng: params.feed[0]?.location.lng ?? 28.04
      },
      radiusMeters: 1_800,
      riskColor: "ORANGE",
      reason: "Simultaneous power and connectivity degradation in this area.",
      source: sourceWithUncertainty(
        "sentinel-synthesis",
        "ai_detected",
        0.7,
        "Synthesized from outage overlays; boundary can shift as providers restore service."
      )
    });
  }

  return zones;
}

export function evaluateGeofenceEntry(params: {
  location: Coordinates;
  headingDegrees: number;
  speedMps: number;
  zones: GeofenceZone[];
  tier: UserTier;
}): Alert[] {
  const projectionSeconds = canAccessFeature(params.tier, "advanced_geofencing") ? 180 : 40;
  const projectedDistance = Math.max(10, params.speedMps * projectionSeconds);
  const projectedPoint = projectPoint(params.location, params.headingDegrees, projectedDistance);

  const alerts: Alert[] = [];

  for (const zone of params.zones) {
    const currentDistance = distanceMeters(params.location, zone.center);
    const projectedZoneDistance = distanceMeters(projectedPoint, zone.center);
    const projectedEntry = projectedZoneDistance <= zone.radiusMeters;

    if (projectedEntry || currentDistance <= zone.radiusMeters) {
      alerts.push({
        id: randomUUID(),
        title: projectedEntry ? "Caution: approaching elevated-risk area" : "You are in elevated-risk area",
        body: zone.reason,
        category: "personal_safety",
        escalation: zone.riskColor === "RED" ? "high" : zone.riskColor === "ORANGE" ? "medium" : "low",
        createdAt: new Date().toISOString(),
        silentVibration: true
      });
    }
  }

  return alerts.slice(0, 3);
}
