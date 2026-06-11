import { strict as assert } from "node:assert";
import test from "node:test";
import type { FeedEvent } from "./types.js";
import { calculateRiskScore } from "./risk.js";

const baseEvent: FeedEvent = {
  id: "e-1",
  type: "crime",
  title: "Event",
  description: "Desc",
  severity: "high",
  occurredAt: new Date().toISOString(),
  location: { lat: -26.2, lng: 28.0 },
  source: {
    provider: "test",
    kind: "official",
    confidence: 0.9
  },
  verified: true
};

test("calculateRiskScore keeps score in range and emits color", () => {
  const risk = calculateRiskScore([baseEvent], 2, false, 0.3);

  assert.ok(risk.score >= 0 && risk.score <= 100);
  assert.ok(["GREEN", "YELLOW", "ORANGE", "RED"].includes(risk.color));
  assert.ok(risk.reasons.length > 0);
});

test("critical conditions push risk toward red", () => {
  const events: FeedEvent[] = Array.from({ length: 6 }, (_, index) => ({
    ...baseEvent,
    id: `critical-${index}`,
    severity: "critical",
    type: "civil_unrest"
  }));

  const risk = calculateRiskScore(events, 6, true, 0.95);
  assert.equal(risk.color, "RED");
  assert.ok(risk.score >= 75);
});
