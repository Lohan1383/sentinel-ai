import dayjs from "dayjs";
import type {
  AlertCategory,
  AlertNotification,
  LoadSheddingStatus,
  NetworkStatus,
  RiskEvent,
  RiskScore,
  Severity
} from "@sentinel/shared";
import { v4 as uuid } from "uuid";

const categoryByType: Record<RiskEvent["type"], AlertCategory> = {
  crime_alert: "personal_safety",
  power_outage: "infrastructure_failure",
  network_outage: "infrastructure_failure",
  civil_unrest: "personal_safety",
  severe_weather: "environmental_risk",
  transport_disruption: "infrastructure_failure",
  verified_user_report: "personal_safety"
};

function severityToEscalation(severity: Severity): 1 | 2 | 3 {
  if (severity === "low") {
    return 1;
  }

  if (severity === "medium") {
    return 2;
  }

  return 3;
}

export class AlertService {
  getAlerts(events: RiskEvent[], risk: RiskScore, loadShedding: LoadSheddingStatus, network: NetworkStatus): AlertNotification[] {
    const now = new Date().toISOString();
    const eventAlerts = events
      .filter((event) => {
        const recent = dayjs().diff(dayjs(event.occurredAt), "minute") < 180;
        const nearby = typeof event.distanceKm === "number" ? event.distanceKm <= 6 : true;
        return nearby && recent && (event.severity === "high" || event.severity === "critical");
      })
      .slice(0, 4)
      .map((event) => ({
        id: uuid(),
        category: categoryByType[event.type],
        title: event.title,
        message: event.summary,
        severity: event.severity,
        silentVibration: true,
        escalationLevel: severityToEscalation(event.severity),
        eventId: event.id,
        createdAt: now
      }));

    const infraAlerts: AlertNotification[] = [];

    if (loadShedding.unexpectedOutage) {
      infraAlerts.push({
        id: uuid(),
        category: "infrastructure_failure",
        title: "Unexpected outage near your area",
        message: `Power instability detected in ${loadShedding.areaName}.`,
        severity: "medium",
        silentVibration: true,
        escalationLevel: 2,
        createdAt: now
      });
    }

    if (network.mobile !== "stable" || network.fibre !== "stable") {
      infraAlerts.push({
        id: uuid(),
        category: "infrastructure_failure",
        title: "Connectivity degradation",
        message: `Network is ${network.mobile} (mobile) and ${network.fibre} (fibre).`,
        severity: "medium",
        silentVibration: true,
        escalationLevel: 2,
        createdAt: now
      });
    }

    if (risk.score >= 75) {
      infraAlerts.push({
        id: uuid(),
        category: "personal_safety",
        title: "High-risk area advisory",
        message: "Live risk has escalated. Review nearby events before traveling.",
        severity: "high",
        silentVibration: true,
        escalationLevel: 3,
        createdAt: now
      });
    }

    return [...eventAlerts, ...infraAlerts];
  }
}
