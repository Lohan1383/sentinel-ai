import type { SourceLabel } from "./types.js";

export function sourceWithUncertainty(
  provider: string,
  kind: SourceLabel["kind"],
  confidence: number,
  uncertaintyReason?: string
): SourceLabel {
  return {
    provider,
    kind,
    confidence: Math.max(0, Math.min(confidence, 1)),
    uncertaintyReason
  };
}

export function isUncertain(source: SourceLabel): boolean {
  return source.confidence < 0.65 || Boolean(source.uncertaintyReason);
}
