import type { RiskColor, RiskScoreBreakdown, Severity } from "./types";

export const severityWeight: Record<Severity, number> = {
  low: 10,
  medium: 25,
  high: 45,
  critical: 70
};

export function scoreToColor(score: number): RiskColor {
  if (score < 25) {
    return "green";
  }

  if (score < 50) {
    return "yellow";
  }

  if (score < 75) {
    return "orange";
  }

  return "red";
}

export function normalizeRiskScore(input: RiskScoreBreakdown): number {
  const raw =
    input.crimeFactor +
    input.infrastructureFactor +
    input.weatherFactor +
    input.unrestFactor +
    input.transportFactor +
    input.verificationPenalty;

  return Math.max(0, Math.min(100, Math.round(raw)));
}
