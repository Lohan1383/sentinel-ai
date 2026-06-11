import { randomUUID } from "node:crypto";
import type { FeedEvent, Severity } from "@sentinel/shared";
import { sourceWithUncertainty } from "@sentinel/shared";
import { jitterLocation } from "../../domain/geo.js";
import type { Coordinates } from "@sentinel/shared";

export function buildEvent(
  location: Coordinates,
  params: {
    type: FeedEvent["type"];
    title: string;
    description: string;
    severity: Severity;
    northOffsetMeters: number;
    eastOffsetMeters: number;
    provider: string;
    kind: FeedEvent["source"]["kind"];
    confidence: number;
    minutesAgo: number;
    uncertaintyReason?: string;
    verified?: boolean;
  }
): FeedEvent {
  const occurredAt = new Date(Date.now() - params.minutesAgo * 60_000).toISOString();

  return {
    id: randomUUID(),
    type: params.type,
    title: params.title,
    description: params.description,
    severity: params.severity,
    occurredAt,
    location: jitterLocation(location, params.northOffsetMeters, params.eastOffsetMeters),
    source: sourceWithUncertainty(
      params.provider,
      params.kind,
      params.confidence,
      params.uncertaintyReason
    ),
    verified: params.verified ?? params.confidence >= 0.75
  };
}
