import { Router } from "express";
import type { IntelligenceService } from "../services/intelligence.service";
import type { OnboardingService } from "../services/onboarding.service";
import { parseLocationQuery } from "../utils/http";

export function createDashboardRouter(intelligence: IntelligenceService, onboarding: OnboardingService): Router {
  const router = Router();

  router.get("/", async (req, res, next) => {
    try {
      const location = parseLocationQuery(req.query as Record<string, unknown>);
      const dashboard = await intelligence.getDashboard(location, req.userTier);

      res.json({
        ...dashboard,
        userTier: req.userTier
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/onboarding-permissions", (_req, res) => {
    res.json({
      permissions: onboarding.getPermissions()
    });
  });

  return router;
}
