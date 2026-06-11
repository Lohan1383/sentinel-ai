import { Router } from "express";

export function healthRoute(): Router {
  const router = Router();

  router.get("/health", (_req, res) => {
    res.json({ ok: true, service: "sentinel-api", ts: new Date().toISOString() });
  });

  return router;
}
