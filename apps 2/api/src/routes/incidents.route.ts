import { Router } from "express";
import { mkdirSync } from "node:fs";
import path from "node:path";
import multer from "multer";
import { z } from "zod";
import type { SentinelRuntime } from "../services/runtime.js";

const incidentBodySchema = z.object({
  userId: z.string().min(1),
  location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180)
  }),
  imageUrl: z.string().url(),
  description: z.string().max(400).optional(),
  capturedAt: z.string().datetime()
});

export function incidentsRoute(runtime: SentinelRuntime): Router {
  const router = Router();
  const uploadDir = path.join(process.cwd(), "uploads");
  mkdirSync(uploadDir, { recursive: true });

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || ".jpg";
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1_000_000)}${ext}`);
    }
  });
  const upload = multer({ storage, limits: { fileSize: 8 * 1024 * 1024 } });

  router.post("/v1/incidents/upload", upload.single("image"), (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image file uploaded." });
      }

      return res.status(201).json({
        imageUrl: `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`
      });
    } catch (error) {
      return next(error);
    }
  });

  router.post("/v1/incidents/report", async (req, res, next) => {
    try {
      const incident = incidentBodySchema.parse(req.body);
      const result = await runtime.reportIncident(incident);
      res.status(result.published ? 201 : 202).json(result);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
