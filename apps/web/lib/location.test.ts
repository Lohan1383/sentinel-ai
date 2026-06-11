import { describe, expect, it } from "vitest";
import { deriveRouteVector } from "./location";

describe("deriveRouteVector", () => {
  it("returns undefined when no previous point", () => {
    const result = deriveRouteVector(undefined, { lat: -26.2, lng: 28.04 }, 8);
    expect(result).toBeUndefined();
  });

  it("computes vector from two points", () => {
    const result = deriveRouteVector({ lat: -26.2, lng: 28.04 }, { lat: -26.19, lng: 28.05 }, 20);
    expect(result).toBeDefined();
    expect(result?.bearingDegrees).toBeGreaterThanOrEqual(0);
    expect(result?.speedKph).toBeGreaterThanOrEqual(0);
  });
});
