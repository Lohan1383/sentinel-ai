import type { Alert } from "@sentinel/shared";

export function AlertsPanel({ alerts }: { alerts: Alert[] }) {
  if (alerts.length === 0) {
    return <p className="muted">No active alerts.</p>;
  }

  return (
    <section>
      <h2>Active Alerts</h2>
      <ul className="alerts-grid">
        {alerts.map((alert) => (
          <li key={alert.id} className={`alert-card escalation-${alert.escalation}`}>
            <h3>{alert.title}</h3>
            <p>{alert.body}</p>
            <p className="smallcaps">
              {alert.category.replace("_", " ")} · {alert.escalation}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
