import type { ErrorRequestHandler } from "express";

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const status = typeof err.statusCode === "number" ? err.statusCode : 500;
  const message = err instanceof Error ? err.message : "Internal server error";

  console.error("API Error:", err);

  res.status(status).json({
    error: message
  });
};
