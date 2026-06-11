import { Router } from "express";
import { getFeatureAccess } from "@sentinel/shared";

export function createFeaturesRouter(): Router {
  const router = Router();

  router.get("/", (req, res) => {
    res.json({
      tier: req.userTier,
      features: getFeatureAccess(req.userTier)
    });
  });

  return router;
}
