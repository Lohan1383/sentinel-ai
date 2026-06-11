import dayjs from "dayjs";
import type {
  LoadSheddingStatus,
  NetworkStatus,
  RiskEvent,
  RiskScore,
  RiskScoreBreakdown,
  Severity
} from "@sentinel/shared";
import { normalizeRiskScore, scoreToColor, severityWeight } from "@sentinel/shared";

const severityMultiplier: Record<Severity, number> = {
  low: 0.2,
  medium: 0.45,
  high: 0.75,
  critical: 1
};

export class RiskScoreService {
  calculate(
    events: RiskEvent[],
    crimeFactor: number,
    loadShedding: LoadSheddingStatus,
    network: NetworkStatus,
    now = new Date()
  ): RiskScore {
    let unrestFactor = 0;
    let weatherFactor = 0;
    let transportFactor = 0;
    let verificationPenalty = 0;

    for (const event of events) {
      const ageHours = Math.max(0.25, dayjs(now).diff(dayjs(event.occurredAt), "hour", true));
      const recency = 1 / Math.min(ageHours, 10);
      const weighted = severityWeight[event.severity] * severityMultiplier[event.severity] * recency;

      if (event.type === "civil_unrest") {
        unrestFactor += weighted / 5;
      }

      if (event.type === "severe_weather") {
        weatherFactor += weighted / 6;
      }

      if (event.type === "transport_disruption") {
        transportFactor += weighted / 8;
      }

      if (event.type === "verified_user_report" && typeof event.confidenceScore === "number") {
        verificationPenalty += event.confidenceScore < 0.78 ? 3 : 0;
      }
    }

    const infrastructureFactor =
      loadShedding.stage * 4 +
      (loadShedding.unexpectedOutage ? 10 : 0) +
      (network.mobile === "degraded" ? 5 : network.mobile === "down" ? 12 : 0) +
      (network.fibre === "degraded" ? 5 : network.fibre === "down" ? 12 : 0);

    const breakdown: RiskScoreBreakdown = {
      crimeFactor,
      infrastructureFactor,
      weatherFactor: Number(weatherFactor.toFixed(2)),
      unrestFactor: Number(unrestFactor.toFixed(2)),
      transportFactor: Number(transportFactor.toFixed(2)),
      verificationPenalty
    };

    const score = normalizeRiskScore(breakdown);
    return {
      score,
      color: scoreToColor(score),
      breakdown,
      updatedAt: now.toISOString()
    };
  }
}
