import { Router } from "express";
import type { SentinelRuntime } from "../services/runtime.js";
import { parseLocation } from "./helpers.js";

export function dashboardRoute(runtime: SentinelRuntime): Router {
  const router = Router();

  router.get("/v1/dashboard", async (req, res, next) => {
    try {
      const location = parseLocation(req.query);
      const snapshot = await runtime.getDashboard(location);
      res.json(snapshot);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
