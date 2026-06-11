import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  ALLOWED_ORIGIN: z.string().default("http://localhost:3000"),
  INCIDENT_CONFIDENCE_THRESHOLD: z.coerce.number().min(0).max(1).default(0.72),
  GOOGLE_GEOCODING_API_KEY: z.string().optional(),
  GOOGLE_CUSTOM_SEARCH_API_KEY: z.string().optional(),
  GOOGLE_CUSTOM_SEARCH_ENGINE_ID: z.string().optional(),
  WEATHER_API_BASE_URL: z.string().optional(),
  TRANSPORT_FEED_BASE_URL: z.string().optional(),
  POWER_FEED_BASE_URL: z.string().optional(),
  NETWORK_STATUS_BASE_URL: z.string().optional()
});

export const env = envSchema.parse(process.env);
