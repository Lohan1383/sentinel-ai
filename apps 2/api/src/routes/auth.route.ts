import { randomUUID } from "node:crypto";
import { Router } from "express";
import { z } from "zod";

const startSchema = z.object({
  channel: z.enum(["phone", "email"]),
  target: z.string().min(4)
});

const verifySchema = z.object({
  sessionId: z.string().uuid(),
  otp: z.string().length(6)
});

export function authRoute(): Router {
  const router = Router();

  router.post("/v1/auth/otp/start", (req, res, next) => {
    try {
      const data = startSchema.parse(req.body);
      res.status(201).json({
        sessionId: randomUUID(),
        channel: data.channel,
        targetHint: data.target.slice(0, 3) + "***",
        expiresInSeconds: 300,
        note: "Demo OTP flow scaffolded for V1 foundation. Integrate real provider in production."
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/v1/auth/otp/verify", (req, res, next) => {
    try {
      const data = verifySchema.parse(req.body);
      const valid = data.otp === "123456";
      res.status(valid ? 200 : 401).json({
        verified: valid,
        token: valid ? `demo-token-${data.sessionId}` : undefined
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
