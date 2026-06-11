import type { UserTier } from "@sentinel/shared";

declare global {
  namespace Express {
    interface Request {
      userTier: UserTier;
    }
  }
}

export {};
