import type { GeoPoint, RouteVector } from "./types";

const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function distanceKm(origin: GeoPoint, target: GeoPoint): number {
  const dLat = toRadians(target.lat - origin.lat);
  const dLng = toRadians(target.lng - origin.lng);
  const originLat = toRadians(origin.lat);
  const targetLat = toRadians(target.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(originLat) * Math.cos(targetLat);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

export function isHeadingToward(
  current: GeoPoint,
  target: GeoPoint,
  route: RouteVector,
  thresholdDegrees = 45
): boolean {
  const y = Math.sin(toRadians(target.lng - current.lng)) * Math.cos(toRadians(target.lat));
  const x =
    Math.cos(toRadians(current.lat)) * Math.sin(toRadians(target.lat)) -
    Math.sin(toRadians(current.lat)) *
      Math.cos(toRadians(target.lat)) *
      Math.cos(toRadians(target.lng - current.lng));

  const bearingToTarget = (Math.atan2(y, x) * 180) / Math.PI;
  const normalizedBearing = (bearingToTarget + 360) % 360;
  const diff = Math.abs(((normalizedBearing - route.bearingDegrees + 540) % 360) - 180);

  return diff <= thresholdDegrees;
}
