import { Router } from "express";
import type { IntelligenceService } from "../services/intelligence.service";
import { parseLocationQuery } from "../utils/http";

export function createAlertsRouter(intelligence: IntelligenceService): Router {
  const router = Router();

  router.get("/", async (req, res, next) => {
    try {
      const location = parseLocationQuery(req.query as Record<string, unknown>);
      const alerts = await intelligence.getAlerts(location, req.userTier);

      res.json({ alerts });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
