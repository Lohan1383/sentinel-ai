import type { GeoPoint, RouteVector } from "@sentinel/shared";

export function deriveRouteVector(previous: GeoPoint | undefined, current: GeoPoint, elapsedSeconds: number): RouteVector | undefined {
  if (!previous || elapsedSeconds <= 0) {
    return undefined;
  }

  const latDiff = current.lat - previous.lat;
  const lngDiff = current.lng - previous.lng;
  const bearing = ((Math.atan2(lngDiff, latDiff) * 180) / Math.PI + 360) % 360;

  const kmPerDegreeLat = 111.32;
  const kmPerDegreeLng = 111.32 * Math.cos((current.lat * Math.PI) / 180);
  const distanceKm = Math.sqrt((latDiff * kmPerDegreeLat) ** 2 + (lngDiff * kmPerDegreeLng) ** 2);
  const speedKph = (distanceKm / elapsedSeconds) * 3600;

  return {
    bearingDegrees: Number(bearing.toFixed(2)),
    speedKph: Number(Math.max(0, Math.min(140, speedKph)).toFixed(2))
  };
}
