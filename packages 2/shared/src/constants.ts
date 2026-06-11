import type { FeatureGate, UserTier } from "./types.js";

export const SA_DEFAULT_CENTER = {
  lat: -26.2041,
  lng: 28.0473
};

export const FEED_AUTO_REFRESH_MS = 30_000;

export const DASHBOARD_AUTO_REFRESH_MS = 20_000;

export const TIER_RANK: Record<UserTier, number> = {
  free: 0,
  plus: 1,
  family: 2,
  estate: 3
};

export const FEATURE_GATES: FeatureGate[] = [
  { key: "advanced_geofencing", minimumTier: "plus" },
  { key: "family_sharing", minimumTier: "family" },
  { key: "complex_alerts", minimumTier: "estate" },
  { key: "historical_analytics", minimumTier: "plus" },
  { key: "priority_alerts", minimumTier: "plus" },
  { key: "incident_upload_priority", minimumTier: "plus" },
  { key: "tourist_mode_extended", minimumTier: "plus" }
];

export const RISK_COLOR_BOUNDARIES = {
  GREEN_MAX: 29,
  YELLOW_MAX: 54,
  ORANGE_MAX: 74
};
