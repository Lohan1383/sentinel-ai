import type { RiskEvent } from "@sentinel/shared";
import styles from "./sentinel-app.module.css";

interface EventFeedProps {
  events: RiskEvent[];
}

const severityClass = {
  low: styles.severityLow,
  medium: styles.severityMedium,
  high: styles.severityHigh,
  critical: styles.severityCritical
} as const;

export function EventFeed({ events }: EventFeedProps) {
  if (events.length === 0) {
    return <p className={styles.small}>No recent events within your current radius.</p>;
  }

  return (
    <div className={`${styles.feedList} ${styles.feedPanel}`}>
      {events.map((event) => (
        <article key={event.id} className={styles.feedItem}>
          <p className={styles.feedTitle}>{event.title}</p>
          <p className={styles.feedSummary}>{event.summary}</p>
          <div className={styles.feedMeta}>
            <span>{new Date(event.occurredAt).toLocaleTimeString()}</span>
            <span>{event.distanceKm !== undefined ? `${event.distanceKm.toFixed(1)} km` : "Distance unavailable"}</span>
            <span className={`${styles.severityPill} ${severityClass[event.severity]}`}>{event.severity}</span>
            <span>Source: {event.source.kind}</span>
            <span>{event.source.label}</span>
          </div>
          {event.source.uncertainty ? <p className={styles.small}>Uncertainty: {event.source.uncertainty}</p> : null}
        </article>
      ))}
    </div>
  );
}
