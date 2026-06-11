import crypto from "node:crypto";
import type { IncidentUploadInput, IncidentVerificationResult, RiskEvent } from "@sentinel/shared";
import { distanceKm } from "@sentinel/shared";
import { v4 as uuid } from "uuid";
import { dataSourceCatalog } from "../domain/data-source-catalog";

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export class IncidentVerificationService {
  private readonly seenHashes = new Set<string>();

  verify(input: IncidentUploadInput, existingEvents: RiskEvent[], threshold: number): IncidentVerificationResult {
    const contentHash = crypto.createHash("sha256").update(input.imageBase64).digest("hex");
    const duplicateLikelihood = this.seenHashes.has(contentHash) ? 1 : 0;

    const sizePenalty = input.imageBase64.length < 1_000 ? 0.65 : input.imageBase64.length < 4_000 ? 0.4 : 0.15;
    const metadataIntegrity =
      input.location.lat <= -22 &&
      input.location.lat >= -35 &&
      input.location.lng >= 16 &&
      input.location.lng <= 33;

    const corroborationCount = existingEvents.filter((event) => {
      if (event.type !== "verified_user_report" && event.type !== "crime_alert") {
        return false;
      }

      const near = distanceKm(event.location, input.location) <= 1.5;
      return near;
    }).length;

    const manipulationLikelihood = clamp(sizePenalty + (duplicateLikelihood > 0 ? 0.2 : 0));

    const confidenceScore = clamp(
      0.45 +
        (metadataIntegrity ? 0.25 : 0) +
        Math.min(0.24, corroborationCount * 0.08) -
        duplicateLikelihood * 0.4 -
        manipulationLikelihood * 0.25
    );

    this.seenHashes.add(contentHash);

    return {
      confidenceScore: Number(confidenceScore.toFixed(2)),
      checks: {
        metadataIntegrity,
        duplicateLikelihood,
        manipulationLikelihood: Number(manipulationLikelihood.toFixed(2)),
        corroborationCount
      },
      shouldPublish: confidenceScore >= threshold,
      source: dataSourceCatalog.aiVision
    };
  }

  toEvent(input: IncidentUploadInput, verification: IncidentVerificationResult): RiskEvent {
    return {
      id: `incident-${uuid()}`,
      type: "verified_user_report",
      title: "Community incident report",
      summary: input.description ?? "Incident submitted by nearby user.",
      occurredAt: input.capturedAt,
      location: input.location,
      severity: verification.confidenceScore >= 0.85 ? "high" : "medium",
      source: dataSourceCatalog.communityReports,
      confidenceScore: verification.confidenceScore,
      labels: ["community", "user-upload", verification.shouldPublish ? "published" : "held"]
    };
  }
}
