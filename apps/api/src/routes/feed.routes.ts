import { Router } from "express";
import type { IntelligenceService } from "../services/intelligence.service";
import { parseLocationQuery } from "../utils/http";

export function createFeedRouter(intelligence: IntelligenceService): Router {
  const router = Router();

  router.get("/", async (req, res, next) => {
    try {
      const location = parseLocationQuery(req.query as Record<string, unknown>);
      const touristMode = req.query.touristMode === "true";
      const events = await intelligence.getFeed(location, req.userTier, touristMode);

      res.json({
        events,
        touristMode,
        sourceLabels: [...new Set(events.map((event) => event.source.label))]
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
