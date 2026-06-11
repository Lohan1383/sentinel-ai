# Sentinel V1 Data Source Labels

All source objects are tagged with:

- `kind`: `official`, `community`, `ai_detected`, or `news`
- `label`: human-readable source name
- `region`: currently South Africa
- optional `uncertainty`: where timing or confidence is probabilistic

## Current source catalog

- SAPS Crime Signals (`official`)
- Eskom + Municipal Outage Signals (`official`)
- Community Power Reports (`community`)
- Provider Network Status (`official`)
- South African Weather Service (`official`)
- Transport & Aviation Operations (`official`)
- Public News Sources (`news`, uncertainty labeled)
- AI Incident Verifier (`ai_detected`, uncertainty labeled)
- Community Verified Reports (`community`, uncertainty labeled)

## Important implementation note

The V1 code includes a seed adapter for deterministic local development. Replace with production adapters per source while preserving source labeling and uncertainty tagging.
