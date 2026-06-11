import type { GeoPoint, LoadSheddingStatus } from "@sentinel/shared";
import { dataSourceCatalog } from "../domain/data-source-catalog";
import { defaultCityFromLocation } from "../utils/sample-data";

export class LoadSheddingService {
  getStatus(location: GeoPoint, now = new Date()): LoadSheddingStatus {
    const city = defaultCityFromLocation(location);
    const minuteBucket = Math.floor(now.getUTCMinutes() / 15);

    const stageMap: Record<typeof city, number> = {
      "johannesburg": 2,
      "cape-town": 1,
      "durban": 3,
      "pretoria": 2
    };

    const unexpectedOutage = city === "johannesburg" ? minuteBucket % 3 === 0 : minuteBucket % 5 === 0;

    return {
      stage: stageMap[city],
      areaName: city,
      scheduleSummary: `${city.toUpperCase()} block rotation check every 2 hours`,
      unexpectedOutage,
      source: unexpectedOutage ? dataSourceCatalog.crowdPower : dataSourceCatalog.municipalPower
    };
  }
}
