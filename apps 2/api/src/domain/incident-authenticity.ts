import { randomUUID } from "node:crypto";
import type { FeedEvent, IncidentAssessment, IncidentUploadInput } from "@sentinel/shared";
import { sourceWithUncertainty } from "@sentinel/shared";
import { distanceMeters } from "./geo.js";

function scoreFromLikelyManipulation(imageUrl: string): number {
  const lower = imageUrl.toLowerCase();
  if (lower.includes("screenshot") || lower.includes("edited") || lower.includes("filter")) {
    return 0.68;
  }
  return 0.25;
}

function buildRationale(parts: {
  metadataValid: boolean;
  duplicateLikelihood: number;
  manipulationLikelihood: number;
  corroborationScore: number;
}): string[] {
  const rationale: string[] = [];
  rationale.push(parts.metadataValid ? "Metadata consistency check passed." : "Missing or invalid metadata fields.");

  if (parts.duplicateLikelihood > 0.7) {
    rationale.push("Potential duplicate report detected in same timeframe and area.");
  }
  if (parts.manipulationLikelihood > 0.55) {
    rationale.push("Image appears likely to be manipulated or re-shared from a processed copy.");
  }
  if (parts.corroborationScore >= 0.5) {
    rationale.push("Corroborated by nearby reports and existing feed signals.");
  } else {
    rationale.push("Low corroboration with independent signals.");
  }

  return rationale;
}

export function assessIncidentAuthenticity(params: {
  incident: IncidentUploadInput;
  existingIncidents: IncidentUploadInput[];
  nearbyEvents: FeedEvent[];
  threshold: number;
}): IncidentAssessment {
  const metadataValid =
    Number.isFinite(Date.parse(params.incident.capturedAt)) &&
    /^https:\/\//.test(params.incident.imageUrl.trim());

  const duplicatesNearby = params.existingIncidents.filter((existing) => {
    const withinDistance =
      distanceMeters(existing.location, params.incident.location) <= 300 &&
      Math.abs(new Date(existing.capturedAt).getTime() - new Date(params.incident.capturedAt).getTime()) <=
        45 * 60_000;
    const sameImage = existing.imageUrl === params.incident.imageUrl;
    return withinDistance || sameImage;
  }).length;

  const duplicateLikelihood = Math.min(1, duplicatesNearby * 0.35);
  const manipulationLikelihood = scoreFromLikelyManipulation(params.incident.imageUrl);

  const corroboratedEvents = params.nearbyEvents.filter((event) => {
    const close = distanceMeters(event.location, params.incident.location) <= 900;
    const recent = Math.abs(Date.now() - new Date(event.occurredAt).getTime()) <= 2 * 60 * 60_000;
    return close && recent;
  }).length;

  const corroborationScore = Math.min(1, corroboratedEvents * 0.24);

  const confidenceScore = Number(
    Math.max(
      0,
      Math.min(
        1,
        (metadataValid ? 0.35 : 0.1) +
          (1 - duplicateLikelihood) * 0.2 +
          (1 - manipulationLikelihood) * 0.25 +
          corroborationScore * 0.2
      )
    ).toFixed(2)
  );

  const shouldPublish = confidenceScore >= params.threshold;

  return {
    metadataValid,
    duplicateLikelihood: Number(duplicateLikelihood.toFixed(2)),
    manipulationLikelihood: Number(manipulationLikelihood.toFixed(2)),
    corroborationScore: Number(corroborationScore.toFixed(2)),
    confidenceScore,
    shouldPublish,
    rationale: buildRationale({
      metadataValid,
      duplicateLikelihood,
      manipulationLikelihood,
      corroborationScore
    })
  };
}

export function incidentToFeedEvent(
  incident: IncidentUploadInput,
  assessment: IncidentAssessment
): FeedEvent {
  return {
    id: randomUUID(),
    type: "community",
    title: "Community incident report",
    description: incident.description ?? "User-submitted incident report",
    severity: assessment.confidenceScore > 0.85 ? "high" : "medium",
    occurredAt: incident.capturedAt,
    location: incident.location,
    source: sourceWithUncertainty(
      "sentinel-community-ai",
      "ai_detected",
      assessment.confidenceScore,
      assessment.shouldPublish
        ? undefined
        : "Below publication confidence threshold. Retained for internal corroboration only."
    ),
    verified: assessment.shouldPublish
  };
}
