import { z } from "zod";

export const locationQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180)
});

export const tierSchema = z.enum(["free", "plus", "family", "estate"]).default("free");

export function parseLocation(query: unknown) {
  return locationQuerySchema.parse(query);
}
