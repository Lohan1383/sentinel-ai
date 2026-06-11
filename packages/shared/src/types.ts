export type UserTier = "free" | "paid_plus" | "paid_family" | "paid_estate";

export type EventType =
  | "crime_alert"
  | "power_outage"
  | "network_outage"
  | "civil_unrest"
  | "severe_weather"
  | "transport_disruption"
  | "verified_user_report";

export type Severity = "low" | "medium" | "high" | "critical";

export type SourceKind = "official" | "community" | "ai_detected" | "news";

export type AlertCategory =
  | "personal_safety"
  | "infrastructure_failure"
  | "environmental_risk";

export type RiskColor = "green" | "yellow" | "orange" | "red";

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface RouteVector {
  bearingDegrees: number;
  speedKph: number;
}

export interface EventSource {
  id: string;
  label: string;
  kind: SourceKind;
  region: string;
  url?: string;
  uncertainty?: string;
}

export interface RiskEvent {
  id: string;
  type: EventType;
  title: string;
  summary: string;
  occurredAt: string;
  location: GeoPoint;
  severity: Severity;
  source: EventSource;
  distanceKm?: number;
  confidenceScore?: number;
  labels: string[];
}

export interface LoadSheddingStatus {
  stage: number;
  areaName: string;
  scheduleSummary: string;
  unexpectedOutage: boolean;
  source: EventSource;
}

export interface NetworkStatus {
  mobile: "stable" | "degraded" | "down";
  fibre: "stable" | "degraded" | "down";
  source: EventSource;
}

export interface RiskScoreBreakdown {
  crimeFactor: number;
  infrastructureFactor: number;
  weatherFactor: number;
  unrestFactor: number;
  transportFactor: number;
  verificationPenalty: number;
}

export interface RiskScore {
  score: number;
  color: RiskColor;
  breakdown: RiskScoreBreakdown;
  updatedAt: string;
}

export interface DashboardState {
  location: GeoPoint;
  risk: RiskScore;
  activeAlerts: AlertNotification[];
  loadShedding: LoadSheddingStatus;
  network: NetworkStatus;
}

export interface AlertNotification {
  id: string;
  category: AlertCategory;
  title: string;
  message: string;
  severity: Severity;
  silentVibration: boolean;
  escalationLevel: 1 | 2 | 3;
  eventId?: string;
  createdAt: string;
}

export interface GeofenceZone {
  id: string;
  label: string;
  center: GeoPoint;
  radiusMeters: number;
  riskReason: string;
  minTier: UserTier;
  severity: Severity;
}

export interface IncidentUploadInput {
  reporterId: string;
  imageBase64: string;
  description?: string;
  location: GeoPoint;
  capturedAt: string;
}

export interface IncidentVerificationResult {
  confidenceScore: number;
  checks: {
    metadataIntegrity: boolean;
    duplicateLikelihood: number;
    manipulationLikelihood: number;
    corroborationCount: number;
  };
  shouldPublish: boolean;
  source: EventSource;
}

export interface PointOfInterest {
  id: string;
  name: string;
  kind: "landmark" | "transport" | "hospital" | "accommodation";
  location: GeoPoint;
  safetyMessage: string;
  riskTags: string[];
}

export interface FeatureAccess {
  liveRiskScore: boolean;
  basicAlerts: boolean;
  publicEventFeed: boolean;
  loadSheddingInfo: boolean;
  touristModeLimited: boolean;
  advancedGeofencing: boolean;
  familySharing: boolean;
  complexWideAlerts: boolean;
  historicalAnalytics: boolean;
  priorityAlerts: boolean;
  incidentUploadPriority: boolean;
}
