import { describe, expect, it } from "vitest";
import { GeofenceService } from "./geofence.service";

describe("GeofenceService", () => {
  it("warns paid users before entering a high-risk zone", () => {
    const service = new GeofenceService();

    const alerts = service.check({
      tier: "paid_plus",
      location: { lat: -26.203, lng: 28.043 },
      route: {
        bearingDegrees: 200,
        speedKph: 45
      }
    });

    expect(alerts.length).toBeGreaterThan(0);
  });
});
