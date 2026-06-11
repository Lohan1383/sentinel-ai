import type { EventSource } from "@sentinel/shared";

export const dataSourceCatalog = {
  sapsCrime: {
    id: "saps-crime-feed",
    label: "SAPS Crime Signals",
    kind: "official",
    region: "South Africa",
    url: "https://www.saps.gov.za/services/crimestats.php"
  },
  municipalPower: {
    id: "municipal-power-feed",
    label: "Eskom + Municipal Outage Signals",
    kind: "official",
    region: "South Africa",
    url: "https://www.eskom.co.za"
  },
  crowdPower: {
    id: "crowd-power-feed",
    label: "Community Power Reports",
    kind: "community",
    region: "South Africa"
  },
  networkOps: {
    id: "network-ops-feed",
    label: "Provider Network Status",
    kind: "official",
    region: "South Africa"
  },
  sawsWeather: {
    id: "saws-weather-feed",
    label: "South African Weather Service",
    kind: "official",
    region: "South Africa",
    url: "https://www.weathersa.co.za"
  },
  transportOps: {
    id: "transport-feed",
    label: "Transport & Aviation Operations",
    kind: "official",
    region: "South Africa"
  },
  unrestNews: {
    id: "unrest-news-feed",
    label: "Public News Sources",
    kind: "news",
    region: "South Africa",
    uncertainty: "Public-news ingestion in V1 is best-effort and may have reporting delay."
  },
  aiVision: {
    id: "incident-ai-verifier",
    label: "AI Incident Verifier",
    kind: "ai_detected",
    region: "South Africa",
    uncertainty: "Confidence score is probabilistic and not forensic proof."
  },
  communityReports: {
    id: "community-reports",
    label: "Community Verified Reports",
    kind: "community",
    region: "South Africa",
    uncertainty: "Published only above confidence threshold, still subject to later correction."
  }
} as const satisfies Record<string, EventSource>;

export const allSources = Object.values(dataSourceCatalog);
