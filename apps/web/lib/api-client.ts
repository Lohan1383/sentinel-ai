import type {
  AlertNotification,
  DashboardState,
  GeoPoint,
  IncidentUploadInput,
  PointOfInterest,
  RiskEvent,
  RouteVector,
  UserTier
} from "@sentinel/shared";
import { config } from "./config";

interface OnboardingPermission {
  key: string;
  title: string;
  reason: string;
  required: boolean;
}

export interface DashboardResponse extends DashboardState {
  userTier: UserTier;
  notes: string[];
}

interface FeedResponse {
  events: RiskEvent[];
  touristMode: boolean;
  sourceLabels: string[];
}

interface AlertsResponse {
  alerts: AlertNotification[];
}

interface PermissionResponse {
  permissions: OnboardingPermission[];
}

interface TouristOverlayResponse {
  points: PointOfInterest[];
}

interface IncidentUploadResponse {
  verification: {
    confidenceScore: number;
    shouldPublish: boolean;
    checks: {
      metadataIntegrity: boolean;
      duplicateLikelihood: number;
      manipulationLikelihood: number;
      corroborationCount: number;
    };
  };
  publishedEvent?: RiskEvent;
}

export interface VisionFrameMetrics {
  brightness: number;
  motion: number;
  edgeDensity: number;
  contrast: number;
  flicker: number;
  haze: number;
  fireLike: number;
  audioRms: number;
  audioPeak: number;
  audioSpike: number;
}

export interface VisionAnalysis {
  analysisSource: "openai" | "openrouter" | "groq" | "local_heuristic";
  analysisModel: string;
  modelReasoning: string[];
  modelStatus: "model_active" | "fallback_local";
  modelError: string | null;
  summary: string;
  confidence: number;
  tags: string[];
  threatScore: number;
  threatRating: number;
  threatLevel: "low" | "elevated" | "high" | "critical";
  shouldAlert: boolean;
  alertReason: string;
  vapeSuspected: boolean;
  vapeConfidence: number;
  knifeSuspected: boolean;
  knifeConfidence: number;
  detectedBehaviors: Array<{
    label:
      | "person_vaping"
      | "person_with_possible_knife"
      | "fire_or_smoke_hazard"
      | "aggressive_body_language"
      | "distress_facial_expression"
      | "audio_threat_signal"
      | "theft_or_shoplifting"
      | "face_obscured"
      | "evasion"
      | "impersonation"
      | "verbal_threats"
      | "concealment";
    confidence: number;
    evidence: string[];
  }>;
  likelyThreats: string[];
  thinking: {
    inputs: VisionFrameMetrics;
    thresholds: Record<string, number>;
    contributions: Record<string, number>;
    rulesFired: string[];
    rulesNotFired: string[];
    escalationPath: string;
    temporal: {
      windowSize: number;
      requiredVotes: Record<
        | "person_vaping"
        | "person_with_possible_knife"
        | "fire_or_smoke_hazard"
        | "aggressive_body_language"
        | "distress_facial_expression"
        | "audio_threat_signal"
        | "theft_or_shoplifting"
        | "face_obscured"
        | "evasion"
        | "impersonation"
        | "verbal_threats"
        | "concealment",
        number
      >;
      votes: Record<
        | "person_vaping"
        | "person_with_possible_knife"
        | "fire_or_smoke_hazard"
        | "aggressive_body_language"
        | "distress_facial_expression"
        | "audio_threat_signal"
        | "theft_or_shoplifting"
        | "face_obscured"
        | "evasion"
        | "impersonation"
        | "verbal_threats"
        | "concealment",
        number
      >;
      latched: Record<
        | "person_vaping"
        | "person_with_possible_knife"
        | "fire_or_smoke_hazard"
        | "aggressive_body_language"
        | "distress_facial_expression"
        | "audio_threat_signal"
        | "theft_or_shoplifting"
        | "face_obscured"
        | "evasion"
        | "impersonation"
        | "verbal_threats"
        | "concealment",
        boolean
      >;
      smoothing: {
        rawThreatRating: number;
        smoothedThreatRating: number;
      };
      finalDetections: Array<
        | "person_vaping"
        | "person_with_possible_knife"
        | "fire_or_smoke_hazard"
        | "aggressive_body_language"
        | "distress_facial_expression"
        | "audio_threat_signal"
        | "theft_or_shoplifting"
        | "face_obscured"
        | "evasion"
        | "impersonation"
        | "verbal_threats"
        | "concealment"
      >;
    };
  };
}

export interface VisionLatestFrame {
  frameId: string;
  imageDataUrl: string;
  capturedAt: string;
  receivedAt: string;
  metrics: VisionFrameMetrics;
  analysis: VisionAnalysis;
}

async function apiFetch<T>(path: string, tier: UserTier, init?: RequestInit): Promise<T> {
  const response = await fetch(`${config.apiUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-user-tier": tier,
      ...(init?.headers ?? {})
    },
    cache: "no-store"
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Request failed (${response.status}): ${body}`);
  }

  return (await response.json()) as T;
}

async function apiFetchNoTier<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${config.apiUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    },
    cache: "no-store"
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Request failed (${response.status}): ${body}`);
  }

  return (await response.json()) as T;
}

export function getDashboard(location: GeoPoint, tier: UserTier): Promise<DashboardResponse> {
  return apiFetch<DashboardResponse>(`/v1/dashboard?lat=${location.lat}&lng=${location.lng}`, tier);
}

export function getOnboardingPermissions(tier: UserTier): Promise<PermissionResponse> {
  return apiFetch<PermissionResponse>("/v1/dashboard/onboarding-permissions", tier);
}

export function getFeed(location: GeoPoint, tier: UserTier, touristMode: boolean): Promise<FeedResponse> {
  return apiFetch<FeedResponse>(
    `/v1/feed?lat=${location.lat}&lng=${location.lng}&touristMode=${touristMode ? "true" : "false"}`,
    tier
  );
}

export function getAlerts(location: GeoPoint, tier: UserTier): Promise<AlertsResponse> {
  return apiFetch<AlertsResponse>(`/v1/alerts?lat=${location.lat}&lng=${location.lng}`, tier);
}

export function checkGeofence(
  location: GeoPoint,
  route: RouteVector | undefined,
  tier: UserTier
): Promise<AlertsResponse> {
  return apiFetch<AlertsResponse>("/v1/geofence/check", tier, {
    method: "POST",
    body: JSON.stringify({
      location,
      route
    })
  });
}

export function getTouristOverlay(location: GeoPoint, tier: UserTier): Promise<TouristOverlayResponse> {
  return apiFetch<TouristOverlayResponse>(`/v1/tourist/overlay?lat=${location.lat}&lng=${location.lng}`, tier);
}

export function uploadIncident(input: IncidentUploadInput, tier: UserTier): Promise<IncidentUploadResponse> {
  return apiFetch<IncidentUploadResponse>("/v1/incidents", tier, {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function createVisionSession(sessionId?: string): Promise<{ sessionId: string }> {
  return apiFetchNoTier<{ sessionId: string }>("/v1/vision/session", {
    method: "POST",
    body: JSON.stringify(sessionId ? { sessionId } : {})
  });
}

export function uploadVisionFrame(input: {
  sessionId: string;
  imageDataUrl: string;
  capturedAt: string;
  metrics: VisionFrameMetrics;
  runtime?: {
    provider: "openai" | "openrouter" | "groq";
    apiKey: string;
    model?: string;
  };
}): Promise<{ frameId: string; analysis: VisionAnalysis; receivedAt: string }> {
  return apiFetchNoTier<{ frameId: string; analysis: VisionAnalysis; receivedAt: string }>("/v1/vision/frame", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function getLatestVisionFrame(sessionId: string): Promise<{ sessionId: string; frame: VisionLatestFrame }> {
  return apiFetchNoTier<{ sessionId: string; frame: VisionLatestFrame }>(`/v1/vision/session/${sessionId}/latest`);
}

export function submitVisionFeedback(input: {
  sessionId: string;
  frameId?: string;
  feedbackType: "false_alarm" | "missed_threat";
  expectedBehavior?:
    | "person_vaping"
    | "person_with_possible_knife"
    | "fire_or_smoke_hazard"
    | "aggressive_body_language"
    | "distress_facial_expression"
    | "audio_threat_signal"
    | "theft_or_shoplifting"
    | "face_obscured"
    | "evasion"
    | "impersonation"
    | "verbal_threats"
    | "concealment"
    | "other";
  notes?: string;
}): Promise<{ ok: true; feedbackId: string }> {
  return apiFetchNoTier<{ ok: true; feedbackId: string }>("/v1/vision/feedback", {
    method: "POST",
    body: JSON.stringify(input)
  });
}
