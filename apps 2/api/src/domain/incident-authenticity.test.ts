import { strict as assert } from "node:assert";
import test from "node:test";
import type { FeedEvent, IncidentUploadInput } from "@sentinel/shared";
import { assessIncidentAuthenticity } from "./incident-authenticity.js";

const incident: IncidentUploadInput = {
  userId: "u1",
  imageUrl: "https://example.com/sample.jpg",
  description: "Suspicious activity",
  capturedAt: new Date().toISOString(),
  location: {
    lat: -26.2,
    lng: 28.0
  }
};

const nearbyEvent: FeedEvent = {
  id: "e1",
  type: "crime",
  title: "Signal",
  description: "Reported signal",
  severity: "medium",
  occurredAt: new Date().toISOString(),
  location: {
    lat: -26.2005,
    lng: 28.0005
  },
  source: {
    provider: "test",
    kind: "official",
    confidence: 0.88
  },
  verified: true
};

test("assessment publishes high-confidence incident", () => {
  const result = assessIncidentAuthenticity({
    incident,
    existingIncidents: [],
    nearbyEvents: [nearbyEvent],
    threshold: 0.65
  });

  assert.equal(result.shouldPublish, true);
  assert.ok(result.confidenceScore >= 0.65);
});

test("assessment blocks likely duplicate manipulated report", () => {
  const result = assessIncidentAuthenticity({
    incident: {
      ...incident,
      imageUrl: "https://example.com/edited-screenshot.jpg"
    },
    existingIncidents: [incident, { ...incident, capturedAt: new Date().toISOString() }],
    nearbyEvents: [],
    threshold: 0.8
  });

  assert.equal(result.shouldPublish, false);
  assert.ok(result.duplicateLikelihood >= 0.35);
  assert.ok(result.manipulationLikelihood >= 0.55);
});
