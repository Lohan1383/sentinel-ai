function resolveApiUrl() {
  const envApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (envApiUrl) {
    return envApiUrl.replace(/\/$/, "");
  }

  // Same-origin proxy in next.config.mjs keeps browser requests secure.
  return "/api";
}

export const config = {
  apiUrl: resolveApiUrl(),
  defaultLocation: {
    lat: Number(process.env.NEXT_PUBLIC_DEFAULT_LAT ?? -26.2041),
    lng: Number(process.env.NEXT_PUBLIC_DEFAULT_LNG ?? 28.0473)
  },
  dashboardRefreshMs: 30000,
  feedRefreshMs: 45000,
  geofenceRefreshMs: 45000
};
