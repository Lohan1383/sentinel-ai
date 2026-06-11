# Sentinel V1

Sentinel V1 is a mobile-first PWA + Node API foundation for real-time personal safety and infrastructure awareness in South Africa.

## What is implemented in V1

- Explicit onboarding permission rationale and opt-in flow
- Live dashboard with risk score (0-100), color state, active alerts, load shedding, and network status
- Real-time feed with severity, distance, source labels, and timestamps
- Load shedding + unexpected outage signals (official + community labeled)
- Network status monitoring for mobile/fibre stability
- Crime intelligence factor (read-only contextual scoring, no prediction)
- Geofencing alerts with tier-based advanced route prediction
- Incident upload with AI authenticity checks and confidence threshold publishing
- Tourist Mode with safer phrasing and POI safety overlay
- Alert system with category + escalation + silent vibration handling
- Freemium tier gating with no hardcoded pricing

## What is intentionally not implemented in V1

No hardware integrations are implemented. V2 remains vision-only.

## Architecture

- `apps/web`: Next.js PWA client
- `apps/api`: Node.js API gateway and risk engine
- `packages/shared`: shared domain types and core utilities

## Quick start

```bash
pnpm install
pnpm dev
```

- Web: `http://localhost:3000`
- API: `http://localhost:4000`

Copy environment templates before running:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

## Key API endpoints

- `GET /v1/health`
- `GET /v1/features`
- `GET /v1/dashboard?lat=<>&lng=<>`
- `GET /v1/dashboard/onboarding-permissions`
- `GET /v1/feed?lat=<>&lng=<>&touristMode=true|false`
- `GET /v1/alerts?lat=<>&lng=<>`
- `POST /v1/geofence/check`
- `POST /v1/incidents`
- `GET /v1/tourist/overlay?lat=<>&lng=<>`
- `GET /v1/realtime/stream?lat=<>&lng=<>&tier=free|paid_plus|...`

## Validation commands

```bash
pnpm typecheck
pnpm test
pnpm lint
```

## Data-source labeling

Every event/status includes source metadata and uncertainty labels where confidence is probabilistic or best-effort.

See:
- `docs/architecture.md`
- `docs/data-sources.md`
