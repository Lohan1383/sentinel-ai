# Sentinel V1 Architecture

## Core Principles

- Mobile-first PWA with native-ready boundaries
- Battery-aware polling and visibility throttling
- Privacy-first: no continuous audio/video capture
- Source-labeled intelligence with uncertainty flags
- Modular contracts for future V2 inputs

## Runtime Flow

1. Providers fetch source signals (official + community + AI web intelligence)
2. API runtime aggregates events, power, and network states
3. Risk engine computes score and color state (0-100)
4. Alert engine derives category alerts with escalation logic
5. Geofence engine produces dangerous zones and pre-entry alerts
6. Realtime hub pushes updates through WebSocket channel

## API Components

- `src/data/providers/*`: adapters for domain feed categories
- `src/domain/risk-engine.ts`: risk score synthesis
- `src/domain/alert-engine.ts`: severity-aware escalation
- `src/domain/geofence-engine.ts`: movement projection and zone entry checks
- `src/domain/incident-authenticity.ts`: confidence scoring + publication threshold
- `src/services/runtime.ts`: orchestration and background refresh loop

## Web Components

- Dashboard: live risk + status + active alerts + mini feed
- Feed: realtime scrollable event stream with source labels
- Report: image upload + authenticity assessment output
- Tourist: POI overlay with safer phrasing
- Onboarding: explicit permission rationale and consent capture

## Background and Lock-Screen Alerts

V1 uses:

- Web push + service worker notification pipeline
- Periodic geofence checks while app is active
- Vibration + notification hooks for urgent alerts

For guaranteed lock-screen behavior on all mobile platforms, native wrappers are expected in a later release while preserving current API contracts.

## Data Source Labeling Contract

Every event includes:

- `provider`
- `kind` (`official` | `community` | `ai_detected`)
- `confidence` (0..1)
- optional `uncertaintyReason`

## V2 Extension Contracts (Hooks Only)

Defined in `packages/shared/src/v2-hooks.ts`:

- Smart cap camera
- Audio danger detection
- Watch stress signals
- Vehicle crash telemetry
- Home camera bridge

All hooks are disabled (`enabled: false`) in V1.
