import { FEATURE_GATES, TIER_RANK } from "./constants.js";
import type { FeatureGate, UserTier } from "./types.js";

export function canAccessFeature(tier: UserTier, key: FeatureGate["key"]): boolean {
  const rule = FEATURE_GATES.find((gate) => gate.key === key);
  if (!rule) {
    return false;
  }
  return TIER_RANK[tier] >= TIER_RANK[rule.minimumTier];
}

export function getBlockedFeaturesForTier(tier: UserTier): FeatureGate["key"][] {
  return FEATURE_GATES.filter((gate) => !canAccessFeature(tier, gate.key)).map((gate) => gate.key);
}
