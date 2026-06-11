# Sentinel V1 (Working Name)

Sentinel V1 is a South Africa-focused real-time safety, infrastructure, and environmental risk platform with a freemium-first architecture.

This repository intentionally builds **Version 1 only** and includes **Version 2 hooks as contracts only**.

## Monorepo Layout

- `apps/web` - Next.js PWA client (mobile-first, native-ready foundation)
- `apps/api` - Node.js API gateway and realtime orchestration
- `packages/shared` - Shared domain types, risk logic, gating rules, and V2 extension contracts
- `docs` - Architecture and deployment notes

## V1 Capability Coverage

- Onboarding + explicit permission rationale
- Live dashboard with location, risk score, color state, alerts, power, and network status
- Realtime feed (crime, power, network, unrest, weather, transport, community)
- Load shedding + unexpected outage overlay
- Mobile and fibre provider stability tracking
- Read-only crime web intelligence synthesis with source confidence labels
- Geofence pre-entry risk checks with background-notification hooks
- User incident reporting with AI authenticity scoring and publication thresholds
- Tourist Mode with safety phrasing
- Alert system categories + escalation + silent vibration support
- Freemium gating (no hardcoded pricing)
- V2 integration hooks only (disabled contracts)

## Data Integrity Rules

- Every feed signal is source-labeled (`official`, `community`, `ai_detected`)
- Low-confidence signals include uncertainty reasons
- No fabricated certainty: uncertain signals are explicitly marked

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Configure environment:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.local.example apps/web/.env.local
```

3. Run both apps:

```bash
npm run dev
```

- Web PWA: `http://localhost:3000`
- API + WebSocket: `http://localhost:4000` and `ws://localhost:4000/ws`

## API Endpoints (V1)

- `GET /health`
- `GET /v1/onboarding/permissions`
- `GET /v1/dashboard?lat&lng`
- `GET /v1/feed?lat&lng&limit`
- `GET /v1/load-shedding?lat&lng`
- `GET /v1/network-status?lat&lng`
- `GET /v1/geofence/check?lat&lng&heading&speed&tier`
- `POST /v1/incidents/upload` (multipart image)
- `POST /v1/incidents/report` (image URL + metadata)
- `GET /v1/tourist/pois?lat&lng&enabled&tier`
- `POST /v1/auth/otp/start`
- `POST /v1/auth/otp/verify`

## Tier Gating

Free tier includes:

- Live risk score
- Basic alerts
- Public feed
- Load shedding info
- Limited Tourist Mode

Paid tiers unlock feature flags:

- `advanced_geofencing`
- `family_sharing`
- `complex_alerts`
- `historical_analytics`
- `priority_alerts`
- `incident_upload_priority`
- `tourist_mode_extended`

## V2 Boundaries

- V2 hardware and ambient intelligence are **not implemented**.
- V2 contracts are defined in `packages/shared/src/v2-hooks.ts` for future plug-in modules.

## Testing

```bash
npm run test
npm run typecheck
```
