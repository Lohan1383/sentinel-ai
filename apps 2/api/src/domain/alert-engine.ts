import { randomUUID } from "node:crypto";
import type { Alert, FeedEvent, NetworkStatus, PowerStatus } from "@sentinel/shared";

function categoryForType(type: FeedEvent["type"]): Alert["category"] {
  switch (type) {
    case "crime":
    case "civil_unrest":
    case "community":
      return "personal_safety";
    case "power":
    case "network":
    case "transport":
      return "infrastructure_failure";
    case "weather":
      return "environmental_risk";
    default:
      return "personal_safety";
  }
}

function escalationForSeverity(
  severity: FeedEvent["severity"],
  countInCategoryWithin3Hours: number
): Alert["escalation"] {
  if (severity === "critical" || countInCategoryWithin3Hours >= 4) {
    return "high";
  }
  if (severity === "high" || countInCategoryWithin3Hours >= 2) {
    return "medium";
  }
  return "low";
}

function isRecent(occurredAt: string): boolean {
  return Date.now() - new Date(occurredAt).getTime() <= 3 * 60 * 60_000;
}

export function deriveAlerts(params: {
  feed: FeedEvent[];
  power: PowerStatus;
  network: NetworkStatus;
}): Alert[] {
  const { feed, power, network } = params;
  const byCategory = new Map<Alert["category"], FeedEvent[]>();

  for (const event of feed.filter((item) => isRecent(item.occurredAt))) {
    const category = categoryForType(event.type);
    const list = byCategory.get(category) ?? [];
    list.push(event);
    byCategory.set(category, list);
  }

  const alerts: Alert[] = [];

  for (const [category, events] of byCategory.entries()) {
    const ordered = [...events].sort(
      (a, b) => Number(new Date(b.occurredAt)) - Number(new Date(a.occurredAt))
    );
    const primary = ordered[0];
    if (!primary) {
      continue;
    }

    alerts.push({
      id: randomUUID(),
      title: primary.title,
      body: primary.description,
      category,
      escalation: escalationForSeverity(primary.severity, ordered.length),
      eventId: primary.id,
      createdAt: new Date().toISOString(),
      silentVibration: true
    });
  }

  if (power.unexpectedOutage) {
    alerts.push({
      id: randomUUID(),
      title: "Unexpected outage nearby",
      body:
        "Unplanned power outage signal in your area. Confirm device readiness and avoid low-visibility zones.",
      category: "infrastructure_failure",
      escalation: "medium",
      createdAt: new Date().toISOString(),
      silentVibration: true
    });
  }

  const unstableProviders = [...network.mobile, ...network.fibre].filter(
    (provider) => provider.status !== "online"
  );

  if (unstableProviders.length >= 3) {
    alerts.push({
      id: randomUUID(),
      title: "Connectivity instability",
      body:
        "Multiple network providers degraded or offline. Route and communication reliability may drop.",
      category: "infrastructure_failure",
      escalation: unstableProviders.length > 4 ? "high" : "medium",
      createdAt: new Date().toISOString(),
      silentVibration: true
    });
  }

  return alerts
    .sort((a, b) => Number(new Date(b.createdAt)) - Number(new Date(a.createdAt)))
    .slice(0, 20);
}
