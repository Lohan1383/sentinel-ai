import type { AlertNotification, GeoPoint, RouteVector, UserTier } from "@sentinel/shared";
import { distanceKm, getFeatureAccess, isHeadingToward } from "@sentinel/shared";
import { v4 as uuid } from "uuid";
import { geofenceSeedZones } from "../utils/sample-data";

interface GeofenceCheckInput {
  location: GeoPoint;
  route?: RouteVector;
  tier: UserTier;
}

function tierRank(tier: UserTier): number {
  if (tier === "free") {
    return 0;
  }

  if (tier === "paid_plus") {
    return 1;
  }

  if (tier === "paid_family") {
    return 2;
  }

  return 3;
}

export class GeofenceService {
  check(input: GeofenceCheckInput): AlertNotification[] {
    const access = getFeatureAccess(input.tier);

    const alerts: AlertNotification[] = [];
    for (const zone of geofenceSeedZones) {
      if (tierRank(input.tier) < tierRank(zone.minTier)) {
        continue;
      }

      const distKm = distanceKm(input.location, zone.center);
      const distMeters = distKm * 1000;

      if (distMeters <= zone.radiusMeters) {
        alerts.push({
          id: uuid(),
          category: "personal_safety",
          title: `Entering risk zone: ${zone.label}`,
          message: `${zone.riskReason}. Keep route flexible and avoid stopping in exposed areas.`,
          severity: zone.severity,
          silentVibration: true,
          escalationLevel: zone.severity === "medium" ? 2 : 3,
          createdAt: new Date().toISOString()
        });
        continue;
      }

      if (!access.advancedGeofencing || !input.route) {
        continue;
      }

      const headingTowardZone = isHeadingToward(input.location, zone.center, input.route);
      if (!headingTowardZone) {
        continue;
      }

      const etaMinutes = (distKm / Math.max(20, input.route.speedKph)) * 60;
      if (etaMinutes <= 10) {
        alerts.push({
          id: uuid(),
          category: "personal_safety",
          title: `Route warning: ${zone.label}`,
          message: `Approaching risk zone in about ${Math.max(1, Math.round(etaMinutes))} minutes: ${zone.riskReason}.`,
          severity: zone.severity,
          silentVibration: true,
          escalationLevel: 3,
          createdAt: new Date().toISOString()
        });
      }
    }

    return alerts;
  }
}
