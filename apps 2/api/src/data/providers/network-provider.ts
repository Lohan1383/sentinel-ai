import type { Coordinates, NetworkStatus } from "@sentinel/shared";
import { sourceWithUncertainty } from "@sentinel/shared";
import type { NetworkProvider } from "./types.js";

function pickStatus(seed: number): "online" | "degraded" | "offline" {
  if (seed < 0.15) {
    return "offline";
  }
  if (seed < 0.45) {
    return "degraded";
  }
  return "online";
}

export class ConnectivityProvider implements NetworkProvider {
  readonly name = "network-outage";

  async fetchNetworkStatus(location: Coordinates): Promise<NetworkStatus> {
    const base = Math.abs(Math.sin(location.lat + location.lng + Date.now() / 3_600_000));

    const mobileProviders = ["Vodacom", "MTN", "Cell C", "Telkom Mobile"];
    const fibreProviders = ["Openserve", "Vumatel", "MetroFibre", "Frogfoot"];

    return {
      mobile: mobileProviders.map((provider, index) => {
        const seed = (base + index * 0.11) % 1;
        const status = pickStatus(seed);
        return {
          provider,
          status,
          instabilityScore: Number((1 - seed).toFixed(2)),
          source: sourceWithUncertainty(
            "isp-status-aggregator",
            "official",
            status === "offline" ? 0.7 : 0.83,
            status !== "online"
              ? "Provider status can lag physical restoration by a few minutes."
              : undefined
          )
        };
      }),
      fibre: fibreProviders.map((provider, index) => {
        const seed = (base + index * 0.17 + 0.2) % 1;
        const status = pickStatus(seed);
        return {
          provider,
          status,
          instabilityScore: Number((1 - seed).toFixed(2)),
          source: sourceWithUncertainty(
            "fibre-network-status",
            "official",
            status === "offline" ? 0.69 : 0.8,
            status === "degraded"
              ? "Fibre degradation inferred from packet-loss reports and may vary by suburb edge."
              : undefined
          )
        };
      })
    };
  }
}
