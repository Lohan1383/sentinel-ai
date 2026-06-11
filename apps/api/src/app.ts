import cors from "cors";
import express from "express";
import { env } from "./config/env";
import { SeedSignalAdapter } from "./adapters/signal-adapters";
import { EventAggregatorService } from "./services/event-aggregator.service";
import { LoadSheddingService } from "./services/load-shedding.service";
import { NetworkStatusService } from "./services/network-status.service";
import { CrimeIntelligenceService } from "./services/crime-intel.service";
import { RiskScoreService } from "./services/risk-score.service";
import { AlertService } from "./services/alert.service";
import { GeofenceService } from "./services/geofence.service";
import { IncidentVerificationService } from "./services/incident-verification.service";
import { TouristModeService } from "./services/tourist-mode.service";
import { IntelligenceService } from "./services/intelligence.service";
import { OnboardingService } from "./services/onboarding.service";
import { InMemoryIncidentStore } from "./repositories/incident-store";
import { withUserTier } from "./middleware/tier.middleware";
import { errorHandler } from "./middleware/error-handler";
import { createHealthRouter } from "./routes/health.routes";
import { createFeaturesRouter } from "./routes/features.routes";
import { createDashboardRouter } from "./routes/dashboard.routes";
import { createFeedRouter } from "./routes/feed.routes";
import { createAlertsRouter } from "./routes/alerts.routes";
import { createGeofenceRouter } from "./routes/geofence.routes";
import { createIncidentRouter } from "./routes/incident.routes";
import { createTouristRouter } from "./routes/tourist.routes";
import { createRealtimeRouter } from "./routes/realtime.routes";
import { createVisionRouter } from "./routes/vision.routes";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: env.NODE_ENV === "development" ? true : env.CORS_ORIGIN,
      credentials: true
    })
  );
  app.use(express.json({ limit: "8mb" }));
  app.use(withUserTier);

  const intelligence = new IntelligenceService(
    new EventAggregatorService([new SeedSignalAdapter()]),
    new LoadSheddingService(),
    new NetworkStatusService(),
    new CrimeIntelligenceService(),
    new RiskScoreService(),
    new AlertService(),
    new GeofenceService(),
    new IncidentVerificationService(),
    new TouristModeService(),
    env.INCIDENT_PUBLISH_THRESHOLD,
    new InMemoryIncidentStore()
  );

  const onboarding = new OnboardingService();

  app.use("/v1/health", createHealthRouter());
  app.use("/v1/features", createFeaturesRouter());
  app.use("/v1/dashboard", createDashboardRouter(intelligence, onboarding));
  app.use("/v1/feed", createFeedRouter(intelligence));
  app.use("/v1/alerts", createAlertsRouter(intelligence));
  app.use("/v1/geofence", createGeofenceRouter(intelligence));
  app.use("/v1/incidents", createIncidentRouter(intelligence));
  app.use("/v1/tourist", createTouristRouter(intelligence));
  app.use("/v1/realtime", createRealtimeRouter(intelligence, env));
  app.use("/v1/vision", createVisionRouter());

  app.use(errorHandler);

  return app;
}
