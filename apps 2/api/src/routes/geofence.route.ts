import { Router } from "express";
import { z } from "zod";
import type { SentinelRuntime } from "../services/runtime.js";

const geofenceQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  heading: z.coerce.number().min(0).max(360).default(0),
  speed: z.coerce.number().min(0).max(70).default(0),
  tier: z.enum(["free", "plus", "family", "estate"]).default("free")
});

export function geofenceRoute(runtime: SentinelRuntime): Router {
  const router = Router();

  router.get("/v1/geofence/check", async (req, res, next) => {
    try {
      const query = geofenceQuerySchema.parse(req.query);
      const alerts = await runtime.checkGeofence({
        location: { lat: query.lat, lng: query.lng },
        headingDegrees: query.heading,
        speedMps: query.speed,
        tier: query.tier
      });

      res.json({ alerts, checkedAt: new Date().toISOString() });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
