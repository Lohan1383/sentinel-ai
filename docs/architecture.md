# Sentinel V1 Architecture

## System shape

- PWA frontend (Next.js) handles onboarding, dashboard/feed UI, incident submission, and tourist-mode rendering.
- Google Maps deep-link support is active in V1; full Maps SDK rendering can be enabled using `GOOGLE_MAPS_API_KEY`.
- API gateway (Express + TypeScript) aggregates safety/infrastructure/environment signals and computes risk score + alerts.
- Shared package defines core domain types and risk/geo/tier utilities.

## V1 module boundaries

- `EventAggregatorService`: normalizes multi-source events
- `RiskScoreService`: computes 0-100 risk and color state
- `AlertService`: category + severity escalation output
- `GeofenceService`: in-zone and route-ahead checks
- `IncidentVerificationService`: metadata/duplication/manipulation/corroboration confidence
- `IncidentStore` abstraction: currently in-memory, swappable for PostgreSQL or Firestore without route changes
- `TouristModeService`: plain-language safety phrasing + POI overlay

## Realtime and background

- API emits SSE snapshots (`/v1/realtime/stream`)
- PWA consumes SSE + polling fallback
- PWA performs periodic geofence checks with notification/vibration when available

## Freemium gating

Tier access is enforced via shared feature matrix (`packages/shared/src/tier.ts`) and API user tier middleware.

## V2 extension hooks (vision only)

The following integration points are intentionally prepared, but not implemented in V1:

- Sensor/hardware ingestion adapters can plug into `EventAggregatorService` via `SignalAdapter` interface.
- Additional AI pipelines can plug into incident verification or new domain services without changing route contracts.
- Wearable/vehicle/home device signals can map into the existing `RiskEvent` model + `AlertService` categories.
- Emergency dispatch integrations can consume standardized alert and event payloads.

No V2 hardware/audio/watch/vehicle/home-camera logic exists in this codebase.
