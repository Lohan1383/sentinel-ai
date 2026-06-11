import { Router } from "express";
import { z } from "zod";
import type { SentinelRuntime } from "../services/runtime.js";

const touristQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  tier: z.enum(["free", "plus", "family", "estate"]).default("free"),
  enabled: z.coerce.boolean().default(false)
});

export function touristRoute(runtime: SentinelRuntime): Router {
  const router = Router();

  router.get("/v1/tourist/pois", async (req, res, next) => {
    try {
      const query = touristQuerySchema.parse(req.query);
      if (!query.enabled) {
        return res.json({ enabled: false, pois: [] });
      }

      const pois = await runtime.getTouristPois({ lat: query.lat, lng: query.lng }, query.tier);
      return res.json({ enabled: true, pois });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}
