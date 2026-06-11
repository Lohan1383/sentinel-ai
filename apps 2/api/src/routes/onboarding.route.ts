import { Router } from "express";
import type { SentinelRuntime } from "../services/runtime.js";

export function onboardingRoute(runtime: SentinelRuntime): Router {
  const router = Router();

  router.get("/v1/onboarding/permissions", (_req, res) => {
    res.json({
      permissions: runtime.getPermissionExplanations(),
      privacy: {
        continuousAudioVideoRecording: false,
        policy:
          "Sentinel V1 does not record continuous audio or video. Camera is invoked only for explicit user incident uploads."
      }
    });
  });

  return router;
}
