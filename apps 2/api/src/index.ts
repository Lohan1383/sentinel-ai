import "dotenv/config";
import { createServer } from "node:http";
import path from "node:path";
import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/error-handler.js";
import { authRoute } from "./routes/auth.route.js";
import { dashboardRoute } from "./routes/dashboard.route.js";
import { feedRoute } from "./routes/feed.route.js";
import { geofenceRoute } from "./routes/geofence.route.js";
import { healthRoute } from "./routes/health.route.js";
import { incidentsRoute } from "./routes/incidents.route.js";
import { onboardingRoute } from "./routes/onboarding.route.js";
import { touristRoute } from "./routes/tourist.route.js";
import { RealtimeHub } from "./services/realtime-hub.js";
import { SentinelRuntime } from "./services/runtime.js";
import { InMemoryStore } from "./store/in-memory-store.js";

const app = express();

app.use(
  cors({
    origin: env.ALLOWED_ORIGIN
  })
);
app.use(express.json({ limit: "4mb" }));
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

const store = new InMemoryStore();
const hub = new RealtimeHub();
const runtime = new SentinelRuntime(store, hub, env.INCIDENT_CONFIDENCE_THRESHOLD);

app.use(healthRoute());
app.use(onboardingRoute(runtime));
app.use(authRoute());
app.use(dashboardRoute(runtime));
app.use(feedRoute(runtime));
app.use(geofenceRoute(runtime));
app.use(incidentsRoute(runtime));
app.use(touristRoute(runtime));
app.use(errorHandler);

const httpServer = createServer(app);
hub.attach(httpServer);

void runtime.bootstrap();

httpServer.listen(env.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Sentinel API listening on :${env.PORT}`);
});

function shutdown(signal: string): void {
  // eslint-disable-next-line no-console
  console.log(`Received ${signal}. Shutting down Sentinel API.`);
  runtime.dispose();
  httpServer.close();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
