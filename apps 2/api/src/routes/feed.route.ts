import { Router } from "express";
import { z } from "zod";
import type { SentinelRuntime } from "../services/runtime.js";
import { parseLocation } from "./helpers.js";

const feedQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  limit: z.coerce.number().min(1).max(100).default(40)
});

export function feedRoute(runtime: SentinelRuntime): Router {
  const router = Router();

  router.get("/v1/feed", async (req, res, next) => {
    try {
      const query = feedQuerySchema.parse(req.query);
      const events = await runtime.getFeed({ lat: query.lat, lng: query.lng }, query.limit);
      res.json({ events, updatedAt: new Date().toISOString() });
    } catch (error) {
      next(error);
    }
  });

  router.get("/v1/load-shedding", async (req, res, next) => {
    try {
      const location = parseLocation(req.query);
      const status = await runtime.getPower(location);
      res.json(status);
    } catch (error) {
      next(error);
    }
  });

  router.get("/v1/network-status", async (req, res, next) => {
    try {
      const location = parseLocation(req.query);
      const status = await runtime.getNetwork(location);
      res.json(status);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
