import type { FeatureAccess, UserTier } from "./types";

const freeTier: FeatureAccess = {
  liveRiskScore: true,
  basicAlerts: true,
  publicEventFeed: true,
  loadSheddingInfo: true,
  touristModeLimited: true,
  advancedGeofencing: false,
  familySharing: false,
  complexWideAlerts: false,
  historicalAnalytics: false,
  priorityAlerts: false,
  incidentUploadPriority: false
};

const paidTier: FeatureAccess = {
  ...freeTier,
  touristModeLimited: false,
  advancedGeofencing: true,
  historicalAnalytics: true,
  priorityAlerts: true,
  incidentUploadPriority: true
};

export function getFeatureAccess(tier: UserTier): FeatureAccess {
  if (tier === "free") {
    return freeTier;
  }

  if (tier === "paid_plus") {
    return paidTier;
  }

  if (tier === "paid_family") {
    return {
      ...paidTier,
      familySharing: true
    };
  }

  return {
    ...paidTier,
    familySharing: true,
    complexWideAlerts: true
  };
}
