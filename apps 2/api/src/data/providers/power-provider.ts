import type { Coordinates, PowerStatus } from "@sentinel/shared";
import { sourceWithUncertainty } from "@sentinel/shared";
import type { PowerProvider } from "./types.js";

export class LoadSheddingProvider implements PowerProvider {
  readonly name = "load-shedding";

  async fetchPowerStatus(location: Coordinates): Promise<PowerStatus> {
    const hour = new Date().getHours();
    const stage = hour >= 17 && hour <= 21 ? 3 : hour >= 6 && hour <= 9 ? 2 : 1;
    const unexpectedOutage = Math.abs(location.lat * 1000 + location.lng * 1000) % 7 < 2;

    const today = new Date();

    const schedule = [
      {
        startAt: new Date(today.setHours(6, 0, 0, 0)).toISOString(),
        endAt: new Date(today.setHours(8, 30, 0, 0)).toISOString(),
        stage
      },
      {
        startAt: new Date(today.setHours(18, 0, 0, 0)).toISOString(),
        endAt: new Date(today.setHours(20, 30, 0, 0)).toISOString(),
        stage
      }
    ];

    return {
      stage,
      area: `SA-${Math.abs(Math.round(location.lat * 10))}-${Math.abs(
        Math.round(location.lng * 10)
      )}`,
      schedule,
      unexpectedOutage,
      source: sourceWithUncertainty(
        "municipal-power-feed",
        "official",
        0.81,
        unexpectedOutage ? "Unexpected outage relies on crowd corroboration until municipal confirmation." : undefined
      )
    };
  }
}
