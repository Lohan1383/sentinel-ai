import { z } from "zod";
import type { GeoPoint, RouteVector } from "@sentinel/shared";

const locationSchema = z.object({
  lat: z.coerce.number().min(-35).max(-22),
  lng: z.coerce.number().min(16).max(33)
});

export function parseLocationQuery(query: Record<string, unknown>): GeoPoint {
  return locationSchema.parse({
    lat: query.lat,
    lng: query.lng
  });
}

const routeSchema = z
  .object({
    bearingDegrees: z.number().min(0).max(360),
    speedKph: z.number().min(0).max(180)
  })
  .optional();

export function parseRouteVector(input: unknown): RouteVector | undefined {
  return routeSchema.parse(input);
}
