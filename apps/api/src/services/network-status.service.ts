import type { GeoPoint, NetworkStatus } from "@sentinel/shared";
import { dataSourceCatalog } from "../domain/data-source-catalog";
import { defaultCityFromLocation } from "../utils/sample-data";

export class NetworkStatusService {
  getStatus(location: GeoPoint, now = new Date()): NetworkStatus {
    const city = defaultCityFromLocation(location);
    const unstableWindow = now.getUTCMinutes() % 20 < 6;

    if (city === "johannesburg") {
      return {
        mobile: unstableWindow ? "degraded" : "stable",
        fibre: "degraded",
        source: dataSourceCatalog.networkOps
      };
    }

    if (city === "cape-town") {
      return {
        mobile: "stable",
        fibre: unstableWindow ? "degraded" : "stable",
        source: dataSourceCatalog.networkOps
      };
    }

    if (city === "durban") {
      return {
        mobile: unstableWindow ? "degraded" : "stable",
        fibre: unstableWindow ? "degraded" : "stable",
        source: dataSourceCatalog.networkOps
      };
    }

    return {
      mobile: "stable",
      fibre: "stable",
      source: dataSourceCatalog.networkOps
    };
  }
}
