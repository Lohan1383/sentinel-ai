import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  INCIDENT_PUBLISH_THRESHOLD: z.coerce.number().min(0).max(1).default(0.72),
  REALTIME_REFRESH_MS: z.coerce.number().int().min(10000).max(300000).default(45000),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_VISION_MODEL: z.string().optional(),
  GOOGLE_MAPS_API_KEY: z.string().optional(),
  NEWS_API_KEY: z.string().optional(),
  ESKOMSEPUSH_API_KEY: z.string().optional(),
  WEATHER_API_KEY: z.string().optional()
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(`Invalid environment variables: ${parsed.error.message}`);
}

export const env = parsed.data;
