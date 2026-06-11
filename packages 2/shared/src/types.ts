export type RiskColor = "GREEN" | "YELLOW" | "ORANGE" | "RED";

export type EventType =
  | "crime"
  | "power"
  | "network"
  | "weather"
  | "civil_unrest"
  | "transport"
  | "community";

export type Severity = "low" | "medium" | "high" | "critical";

export type SourceKind = "official" | "community" | "ai_detected";

export type AlertCategory =
  | "personal_safety"
  | "infrastructure_failure"
  | "environmental_risk";

export type EscalationLevel = "low" | "medium" | "high";

export type UserTier = "free" | "plus" | "family" | "estate";

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface SourceLabel {
  provider: string;
  kind: SourceKind;
  confidence: number;
  uncertaintyReason?: string;
}

export interface RiskScore {
  score: number;
  color: RiskColor;
  reasons: string[];
  updatedAt: string;
}

export interface FeedEvent {
  id: string;
  type: EventType;
  title: string;
  description: string;
  severity: Severity;
  occurredAt: string;
  location: Coordinates;
  distanceMeters?: number;
  source: SourceLabel;
  verified: boolean;
}

export interface Alert {
  id: string;
  title: string;
  body: string;
  category: AlertCategory;
  escalation: EscalationLevel;
  eventId?: string;
  createdAt: string;
  silentVibration: boolean;
}

export interface LoadSheddingWindow {
  startAt: string;
  endAt: string;
  stage: number;
}

export interface PowerStatus {
  stage: number;
  area: string;
  schedule: LoadSheddingWindow[];
  unexpectedOutage: boolean;
  source: SourceLabel;
}

export interface ProviderStatus {
  provider: string;
  status: "online" | "degraded" | "offline";
  instabilityScore: number;
  source: SourceLabel;
}

export interface NetworkStatus {
  mobile: ProviderStatus[];
  fibre: ProviderStatus[];
}

export interface DashboardSnapshot {
  location: Coordinates;
  risk: RiskScore;
  activeAlerts: Alert[];
  power: PowerStatus;
  network: NetworkStatus;
  updatedAt: string;
}

export interface IncidentUploadInput {
  userId: string;
  location: Coordinates;
  imageUrl: string;
  description?: string;
  capturedAt: string;
}

export interface IncidentAssessment {
  metadataValid: boolean;
  duplicateLikelihood: number;
  manipulationLikelihood: number;
  corroborationScore: number;
  confidenceScore: number;
  shouldPublish: boolean;
  rationale: string[];
}

export interface GeofenceZone {
  id: string;
  name: string;
  center: Coordinates;
  radiusMeters: number;
  riskColor: RiskColor;
  reason: string;
  source: SourceLabel;
}

export interface RouteProjection {
  headingDegrees: number;
  speedMps: number;
  projectedPoint: Coordinates;
}

export interface PermissionState {
  locationForeground: boolean;
  locationBackground: boolean;
  notifications: boolean;
  motionActivity: boolean;
  cameraUploadOnly: boolean;
}

export interface FeatureGate {
  key:
    | "advanced_geofencing"
    | "family_sharing"
    | "complex_alerts"
    | "historical_analytics"
    | "priority_alerts"
    | "incident_upload_priority"
    | "tourist_mode_extended";
  minimumTier: UserTier;
}

export interface TouristPoi {
  id: string;
  name: string;
  location: Coordinates;
  category: "attraction" | "transport" | "accommodation";
  safetySummary: string;
  riskLevel: RiskColor;
}

export interface CrimeSignal {
  placeLabel: string;
  incidentCount7d: number;
  highSeverityCount7d: number;
  latestIncidentAt?: string;
  sourceCoverage: number;
}

export interface V2ExtensionHook {
  key:
    | "smart_cap_camera"
    | "audio_danger_detection"
    | "watch_stress_signal"
    | "vehicle_crash_detection"
    | "home_camera_bridge";
  enabled: false;
  contract: string;
}
