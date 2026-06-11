import { Router } from "express";
import { z } from "zod";
import type { IntelligenceService } from "../services/intelligence.service";

const incidentSchema = z.object({
  reporterId: z.string().min(1),
  imageBase64: z.string().min(100),
  description: z.string().max(500).optional(),
  location: z.object({
    lat: z.number().min(-35).max(-22),
    lng: z.number().min(16).max(33)
  }),
  capturedAt: z.string().datetime()
});

export function createIncidentRouter(intelligence: IntelligenceService): Router {
  const router = Router();

  router.post("/", (req, res, next) => {
    try {
      const payload = incidentSchema.parse(req.body);
      const result = intelligence.submitIncident(payload);

      res.status(result.publishedEvent ? 201 : 202).json(result);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
