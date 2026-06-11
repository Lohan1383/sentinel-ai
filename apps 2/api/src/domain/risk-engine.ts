import { calculateRiskScore } from "@sentinel/shared";
import type {
  Alert,
  Coordinates,
  DashboardSnapshot,
  FeedEvent,
  NetworkStatus,
  PowerStatus
} from "@sentinel/shared";

function averageNetworkInstability(network: NetworkStatus): number {
  const all = [...network.mobile, ...network.fibre];
  if (all.length === 0) {
    return 0;
  }
  return all.reduce((acc, provider) => acc + provider.instabilityScore, 0) / all.length;
}

export function buildDashboardSnapshot(params: {
  location: Coordinates;
  feed: FeedEvent[];
  power: PowerStatus;
  network: NetworkStatus;
  alerts: Alert[];
}): DashboardSnapshot {
  const { location, feed, power, network, alerts } = params;
  const risk = calculateRiskScore(
    feed,
    power.stage,
    power.unexpectedOutage,
    averageNetworkInstability(network)
  );

  return {
    location,
    risk,
    activeAlerts: alerts.slice(0, 10),
    power,
    network,
    updatedAt: new Date().toISOString()
  };
}
