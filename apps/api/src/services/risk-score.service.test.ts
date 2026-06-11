import { describe, expect, it } from "vitest";
import type { RiskEvent } from "@sentinel/shared";
import { dataSourceCatalog } from "../domain/data-source-catalog";
import { RiskScoreService } from "./risk-score.service";

describe("RiskScoreService", () => {
  it("returns high score for combined stressors", () => {
    const service = new RiskScoreService();
    const events: RiskEvent[] = [
      {
        id: "1",
        type: "crime_alert",
        title: "Crime",
        summary: "Crime summary",
        occurredAt: new Date().toISOString(),
        location: { lat: -26.2, lng: 28.0 },
        severity: "high",
        source: dataSourceCatalog.sapsCrime,
        labels: []
      },
      {
        id: "2",
        type: "civil_unrest",
        title: "Unrest",
        summary: "Unrest summary",
        occurredAt: new Date().toISOString(),
        location: { lat: -26.2, lng: 28.0 },
        severity: "high",
        source: dataSourceCatalog.unrestNews,
        labels: []
      }
    ];

    const result = service.calculate(
      events,
      22,
      {
        stage: 4,
        areaName: "johannesburg",
        scheduleSummary: "stage 4",
        unexpectedOutage: true,
        source: dataSourceCatalog.municipalPower
      },
      {
        mobile: "degraded",
        fibre: "down",
        source: dataSourceCatalog.networkOps
      }
    );

    expect(result.score).toBeGreaterThan(50);
    expect(["yellow", "orange", "red"]).toContain(result.color);
  });
});
