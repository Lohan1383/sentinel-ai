import type { FeedEvent } from "@sentinel/shared";
import { formatDistance, formatTime } from "@/lib/format";
import { SourceChip } from "./source-chip";

export function FeedList({ events }: { events: FeedEvent[] }) {
  if (events.length === 0) {
    return <p className="muted">No active events in range.</p>;
  }

  return (
    <ul className="feed-list">
      {events.map((event) => (
        <li key={event.id} className={`feed-item severity-${event.severity}`}>
          <div className="feed-head">
            <h3>{event.title}</h3>
            <span>{formatTime(event.occurredAt)}</span>
          </div>
          <p>{event.description}</p>
          <div className="feed-meta">
            <span>{event.type.replace("_", " ")}</span>
            <span>{formatDistance(event.distanceMeters)}</span>
            <span>{event.severity}</span>
          </div>
          <SourceChip source={event.source} />
        </li>
      ))}
    </ul>
  );
}
