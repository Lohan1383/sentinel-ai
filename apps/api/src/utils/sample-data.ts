import dayjs from "dayjs";
import type { GeoPoint, GeofenceZone, PointOfInterest, RiskEvent } from "@sentinel/shared";
import { dataSourceCatalog } from "../domain/data-source-catalog";

const johannesburg: GeoPoint = { lat: -26.2041, lng: 28.0473 };
const capeTown: GeoPoint = { lat: -33.9249, lng: 18.4241 };
const durban: GeoPoint = { lat: -29.8587, lng: 31.0218 };
const pretoria: GeoPoint = { lat: -25.7479, lng: 28.2293 };
type CityKey = "johannesburg" | "cape-town" | "durban" | "pretoria";

export function buildSeedEvents(now = new Date()): RiskEvent[] {
  const base = dayjs(now);
  return [
    {
      id: "crime-jhb-1",
      type: "crime_alert",
      title: "Armed robbery hotspot activity reported",
      summary: "Multiple incidents reported by local authorities in the last 3 hours.",
      occurredAt: base.subtract(1, "hour").toISOString(),
      location: { lat: -26.198, lng: 28.043 },
      severity: "high",
      source: dataSourceCatalog.sapsCrime,
      labels: ["johannesburg", "robbery"]
    },
    {
      id: "power-jhb-1",
      type: "power_outage",
      title: "Unexpected power outage in Sandton block",
      summary: "Community reports indicate unscheduled outage affecting mixed residential zones.",
      occurredAt: base.subtract(50, "minute").toISOString(),
      location: { lat: -26.103, lng: 28.056 },
      severity: "medium",
      source: dataSourceCatalog.crowdPower,
      confidenceScore: 0.74,
      labels: ["power", "sandton", "unexpected-outage"]
    },
    {
      id: "network-jhb-1",
      type: "network_outage",
      title: "Mobile network instability",
      summary: "Two providers report degraded services around Rosebank.",
      occurredAt: base.subtract(28, "minute").toISOString(),
      location: { lat: -26.145, lng: 28.042 },
      severity: "medium",
      source: dataSourceCatalog.networkOps,
      labels: ["mobile", "connectivity"]
    },
    {
      id: "weather-kzn-1",
      type: "severe_weather",
      title: "Heavy rainfall warning",
      summary: "SAWS warning for localized flooding and poor visibility.",
      occurredAt: base.subtract(2, "hour").toISOString(),
      location: { lat: -29.9, lng: 30.98 },
      severity: "high",
      source: dataSourceCatalog.sawsWeather,
      labels: ["weather", "rain", "flood-risk"]
    },
    {
      id: "transport-cpt-1",
      type: "transport_disruption",
      title: "Inbound flight delays at CPT",
      summary: "Airport operations indicate average delay of 35 minutes due to weather.",
      occurredAt: base.subtract(45, "minute").toISOString(),
      location: { lat: -33.97, lng: 18.6 },
      severity: "low",
      source: dataSourceCatalog.transportOps,
      labels: ["airport", "flight-delay"]
    },
    {
      id: "unrest-pta-1",
      type: "civil_unrest",
      title: "Service delivery protest impacting route",
      summary: "Public reports show intermittent road closure and debris near arterial roads.",
      occurredAt: base.subtract(70, "minute").toISOString(),
      location: { lat: -25.73, lng: 28.2 },
      severity: "high",
      source: dataSourceCatalog.unrestNews,
      labels: ["protest", "road-closure"]
    },
    {
      id: "community-cpt-1",
      type: "verified_user_report",
      title: "Suspicious activity near parking area",
      summary: "Community upload verified and corroborated by two nearby users.",
      occurredAt: base.subtract(30, "minute").toISOString(),
      location: { lat: -33.928, lng: 18.432 },
      severity: "medium",
      source: dataSourceCatalog.communityReports,
      confidenceScore: 0.82,
      labels: ["community", "verified"]
    }
  ];
}

export const geofenceSeedZones: GeofenceZone[] = [
  {
    id: "zone-jhb-cbd-high-crime",
    label: "Johannesburg CBD High-Risk Pocket",
    center: { lat: -26.203, lng: 28.043 },
    radiusMeters: 1100,
    riskReason: "Recent violent crime cluster",
    minTier: "paid_plus",
    severity: "high"
  },
  {
    id: "zone-pta-unrest",
    label: "Pretoria Active Unrest Area",
    center: { lat: -25.731, lng: 28.197 },
    radiusMeters: 1300,
    riskReason: "Active civil unrest and route blockage",
    minTier: "paid_plus",
    severity: "high"
  },
  {
    id: "zone-cpt-outage",
    label: "Cape Town Dual Outage Zone",
    center: { lat: -33.929, lng: 18.428 },
    radiusMeters: 900,
    riskReason: "Concurrent network and power outages",
    minTier: "free",
    severity: "medium"
  }
];

export function defaultCityFromLocation(location: GeoPoint): CityKey {
  const options: Array<{ key: CityKey; point: GeoPoint }> = [
    { key: "johannesburg", point: johannesburg },
    { key: "cape-town", point: capeTown },
    { key: "durban", point: durban },
    { key: "pretoria", point: pretoria }
  ];

  let winner = options[0]!;
  let best = Number.POSITIVE_INFINITY;
  for (const option of options) {
    const delta = Math.hypot(location.lat - option.point.lat, location.lng - option.point.lng);
    if (delta < best) {
      best = delta;
      winner = option;
    }
  }

  return winner.key;
}

export function poiSeedForCity(city: CityKey): PointOfInterest[] {
  const byCity: Record<CityKey, PointOfInterest[]> = {
    "johannesburg": [
      {
        id: "poi-jhb-rosebank",
        name: "Rosebank Mall",
        kind: "landmark",
        location: { lat: -26.144, lng: 28.041 },
        safetyMessage: "Use marked parking zones and avoid displaying valuables outside entrances.",
        riskTags: ["pickpocket-watch", "traffic"]
      },
      {
        id: "poi-jhb-gautrain",
        name: "Gautrain Park Station",
        kind: "transport",
        location: { lat: -26.204, lng: 28.043 },
        safetyMessage: "Prefer monitored exits and verify transfer options before arrival.",
        riskTags: ["transport-crowd", "route-monitoring"]
      }
    ],
    "cape-town": [
      {
        id: "poi-cpt-vna",
        name: "V&A Waterfront",
        kind: "landmark",
        location: { lat: -33.907, lng: 18.42 },
        safetyMessage: "Stay in well-lit pedestrian zones after dark.",
        riskTags: ["pickpocket-watch"]
      },
      {
        id: "poi-cpt-bus",
        name: "Civic Centre Bus Hub",
        kind: "transport",
        location: { lat: -33.922, lng: 18.427 },
        safetyMessage: "Expect service delays when severe weather alerts are active.",
        riskTags: ["weather-delay", "transport-risk"]
      }
    ],
    "durban": [
      {
        id: "poi-dbn-beachfront",
        name: "Durban Beachfront",
        kind: "landmark",
        location: { lat: -29.851, lng: 31.039 },
        safetyMessage: "Use official parking attendants and avoid isolated walkways.",
        riskTags: ["petty-crime"]
      }
    ],
    "pretoria": [
      {
        id: "poi-pta-union",
        name: "Union Buildings",
        kind: "landmark",
        location: { lat: -25.74, lng: 28.211 },
        safetyMessage: "Check route status for protest disruptions before departure.",
        riskTags: ["crowd", "route-check"]
      }
    ]
  };

  return byCity[city];
}
