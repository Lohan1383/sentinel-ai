import { Router } from "express";
import type { IntelligenceService } from "../services/intelligence.service";
import type { Env } from "../types/env";
import { parseLocationQuery } from "../utils/http";

export function createRealtimeRouter(intelligence: IntelligenceService, env: Env): Router {
  const router = Router();

  router.get("/stream", (req, res, next) => {
    let closed = false;

    try {
      const location = parseLocationQuery(req.query as Record<string, unknown>);

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders();

      const sendSnapshot = async () => {
        if (closed) {
          return;
        }

        try {
          const dashboard = await intelligence.getDashboard(location, req.userTier);
          const payload = JSON.stringify({
            ...dashboard,
            userTier: req.userTier
          });
          res.write(`event: dashboard\ndata: ${payload}\n\n`);
        } catch (error) {
          const message = error instanceof Error ? error.message : "dashboard stream error";
          res.write(`event: error\ndata: ${JSON.stringify({ error: message })}\n\n`);
        }
      };

      void sendSnapshot();
      const interval = setInterval(() => {
        void sendSnapshot();
      }, env.REALTIME_REFRESH_MS);

      req.on("close", () => {
        closed = true;
        clearInterval(interval);
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
