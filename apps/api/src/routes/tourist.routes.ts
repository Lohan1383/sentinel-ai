import { Router } from "express";
import type { IntelligenceService } from "../services/intelligence.service";
import { parseLocationQuery } from "../utils/http";

export function createTouristRouter(intelligence: IntelligenceService): Router {
  const router = Router();

  router.get("/overlay", (req, res, next) => {
    try {
      const location = parseLocationQuery(req.query as Record<string, unknown>);
      const points = intelligence.getTouristOverlay(location, req.userTier);
      res.json({ points });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
