import type {
  DashboardSnapshot,
  FeedEvent,
  IncidentAssessment,
  IncidentUploadInput,
  NetworkStatus,
  PowerStatus,
  TouristPoi,
  UserTier
} from "@sentinel/shared";
import { config } from "./config";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${config.apiBaseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function fetchPermissionInfo() {
  return request<{
    permissions: Record<string, string>;
    privacy: {
      continuousAudioVideoRecording: boolean;
      policy: string;
    };
  }>("/v1/onboarding/permissions");
}

export async function fetchDashboard(lat: number, lng: number): Promise<DashboardSnapshot> {
  return request<DashboardSnapshot>(`/v1/dashboard?lat=${lat}&lng=${lng}`);
}

export async function fetchFeed(lat: number, lng: number, limit = 50): Promise<FeedEvent[]> {
  const body = await request<{ events: FeedEvent[] }>(`/v1/feed?lat=${lat}&lng=${lng}&limit=${limit}`);
  return body.events;
}

export async function fetchPowerStatus(lat: number, lng: number): Promise<PowerStatus> {
  return request<PowerStatus>(`/v1/load-shedding?lat=${lat}&lng=${lng}`);
}

export async function fetchNetworkStatus(lat: number, lng: number): Promise<NetworkStatus> {
  return request<NetworkStatus>(`/v1/network-status?lat=${lat}&lng=${lng}`);
}

export async function checkGeofence(params: {
  lat: number;
  lng: number;
  heading: number;
  speed: number;
  tier: UserTier;
}) {
  return request<{ alerts: Array<{ title: string; body: string; escalation: string }> }>(
    `/v1/geofence/check?lat=${params.lat}&lng=${params.lng}&heading=${params.heading}&speed=${params.speed}&tier=${params.tier}`
  );
}

export async function fetchTouristPois(
  lat: number,
  lng: number,
  enabled: boolean,
  tier: UserTier
): Promise<TouristPoi[]> {
  const body = await request<{ enabled: boolean; pois: TouristPoi[] }>(
    `/v1/tourist/pois?lat=${lat}&lng=${lng}&enabled=${enabled}&tier=${tier}`
  );
  return body.pois;
}

export async function reportIncident(input: IncidentUploadInput): Promise<{
  assessment: IncidentAssessment;
  published: boolean;
}> {
  return request("/v1/incidents/report", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function uploadIncidentImage(file: File): Promise<{ imageUrl: string }> {
  const formData = new FormData();
  formData.append("image", file);

  const response = await fetch(`${config.apiBaseUrl}/v1/incidents/upload`, {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    throw new Error("Image upload failed");
  }

  return response.json() as Promise<{ imageUrl: string }>;
}
