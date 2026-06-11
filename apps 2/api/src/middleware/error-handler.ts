import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (error instanceof ZodError) {
    res.status(400).json({
      message: "Invalid request",
      issues: error.issues
    });
    return;
  }

  res.status(500).json({
    message: "Internal server error"
  });
}
