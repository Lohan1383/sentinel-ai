import type { V2ExtensionHook } from "./types.js";

export const V2_EXTENSION_HOOKS: V2ExtensionHook[] = [
  {
    key: "smart_cap_camera",
    enabled: false,
    contract: "Event payload bridge for external wearable camera risk events"
  },
  {
    key: "audio_danger_detection",
    enabled: false,
    contract: "Audio-derived alert ingestion contract (distress sounds only)"
  },
  {
    key: "watch_stress_signal",
    enabled: false,
    contract: "Normalized wearable stress signal adapter interface"
  },
  {
    key: "vehicle_crash_detection",
    enabled: false,
    contract: "Crash telemetry input adapter contract"
  },
  {
    key: "home_camera_bridge",
    enabled: false,
    contract: "Home safety camera event stream bridge"
  }
];
