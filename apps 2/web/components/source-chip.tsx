import type { SourceLabel } from "@sentinel/shared";

export function SourceChip({ source }: { source: SourceLabel }) {
  return (
    <span className={`source-chip source-${source.kind}`}>
      {source.provider} · {source.kind}
      {source.uncertaintyReason ? " · uncertain" : ""}
    </span>
  );
}
