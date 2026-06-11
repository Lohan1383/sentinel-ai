import { RISK_COLOR_BOUNDARIES } from "./constants.js";
import type { FeedEvent, RiskColor, RiskScore } from "./types.js";

function severityWeight(severity: FeedEvent["severity"]): number {
  switch (severity) {
    case "low":
      return 6;
    case "medium":
      return 12;
    case "high":
      return 20;
    case "critical":
      return 30;
    default:
      return 0;
  }
}

function typeWeight(type: FeedEvent["type"]): number {
  switch (type) {
    case "crime":
      return 1.2;
    case "civil_unrest":
      return 1.1;
    case "weather":
      return 0.9;
    case "power":
      return 0.8;
    case "network":
      return 0.7;
    case "transport":
      return 0.65;
    case "community":
      return 0.75;
    default:
      return 0.6;
  }
}

function getRiskColor(score: number): RiskColor {
  if (score <= RISK_COLOR_BOUNDARIES.GREEN_MAX) {
    return "GREEN";
  }
  if (score <= RISK_COLOR_BOUNDARIES.YELLOW_MAX) {
    return "YELLOW";
  }
  if (score <= RISK_COLOR_BOUNDARIES.ORANGE_MAX) {
    return "ORANGE";
  }
  return "RED";
}

export function calculateRiskScore(
  events: FeedEvent[],
  loadSheddingStage: number,
  hasUnexpectedOutage: boolean,
  averageNetworkInstability: number
): RiskScore {
  const recentEvents = events.slice(0, 30);
  const eventScore = recentEvents.reduce((acc, event) => {
    return acc + severityWeight(event.severity) * typeWeight(event.type);
  }, 0);

  const outageScore = hasUnexpectedOutage ? 12 : loadSheddingStage * 2;
  const networkScore = Math.round(averageNetworkInstability * 10);
  const rawScore = Math.round(eventScore * 0.6 + outageScore + networkScore + 8);
  const score = Math.max(0, Math.min(rawScore, 100));

  const reasons: string[] = [];
  if (recentEvents.length > 0) {
    reasons.push(`${recentEvents.length} relevant incidents in your area feed`);
  }
  if (loadSheddingStage > 0) {
    reasons.push(`Load shedding stage ${loadSheddingStage}`);
  }
  if (hasUnexpectedOutage) {
    reasons.push("Unexpected local power outage reported");
  }
  if (averageNetworkInstability > 0.5) {
    reasons.push("Network stability is degraded");
  }

  return {
    score,
    color: getRiskColor(score),
    reasons,
    updatedAt: new Date().toISOString()
  };
}
