export const config = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000",
  wsUrl: process.env.NEXT_PUBLIC_WS_BASE_URL ?? "ws://localhost:4000/ws",
  defaultTier:
    (process.env.NEXT_PUBLIC_DEFAULT_TIER as "free" | "plus" | "family" | "estate" | undefined) ??
    "free"
};
