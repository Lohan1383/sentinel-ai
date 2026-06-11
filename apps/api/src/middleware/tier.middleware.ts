import type { RequestHandler } from "express";
import type { UserTier } from "@sentinel/shared";

const allowed = new Set<UserTier>(["free", "paid_plus", "paid_family", "paid_estate"]);

export const withUserTier: RequestHandler = (req, _res, next) => {
  const headerTier = req.header("x-user-tier");
  const queryTier = typeof req.query.tier === "string" ? req.query.tier : undefined;
  const candidate = (headerTier ?? queryTier ?? "free") as UserTier;

  req.userTier = allowed.has(candidate) ? candidate : "free";
  next();
};
