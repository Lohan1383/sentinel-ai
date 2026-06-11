import { canAccessFeature } from "@sentinel/shared";
import type { FeatureGate, UserTier } from "@sentinel/shared";

interface GateNoteProps {
  feature: FeatureGate["key"];
  tier: UserTier;
}

export function GateNote({ feature, tier }: GateNoteProps) {
  if (canAccessFeature(tier, feature)) {
    return null;
  }

  return (
    <p className="gate-note">
      Upgrade required for <strong>{feature.replace(/_/g, " ")}</strong>.
    </p>
  );
}
