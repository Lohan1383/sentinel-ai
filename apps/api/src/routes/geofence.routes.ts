import { Router } from "express";
import { z } from "zod";
import type { IntelligenceService } from "../services/intelligence.service";
import { parseRouteVector } from "../utils/http";

const geofenceBodySchema = z.object({
  location: z.object({
    lat: z.number().min(-35).max(-22),
    lng: z.number().min(16).max(33)
  }),
  route: z
    .object({
      bearingDegrees: z.number().min(0).max(360),
      speedKph: z.number().min(0).max(180)
    })
    .optional()
});

export function createGeofenceRouter(intelligence: IntelligenceService): Router {
  const router = Router();

  router.post("/check", (req, res, next) => {
    try {
      const body = geofenceBodySchema.parse(req.body);
      const alerts = intelligence.checkGeofence(body.location, req.userTier, parseRouteVector(body.route));
      res.json({ alerts });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
