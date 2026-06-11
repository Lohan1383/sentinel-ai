import { Router } from "express";

export function createHealthRouter(): Router {
  const router = Router();

  router.get("/", (_req, res) => {
    res.json({
      ok: true,
      service: "sentinel-api",
      version: "v1"
    });
  });

  return router;
}
