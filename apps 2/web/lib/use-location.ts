"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Coordinates } from "@sentinel/shared";
import { SA_DEFAULT_CENTER } from "@sentinel/shared";

interface MotionState {
  heading: number;
  speed: number;
}

function headingFromDelta(a: Coordinates, b: Coordinates): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const toDeg = (value: number) => (value * 180) / Math.PI;

  const dLon = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

export function useLocationTracking() {
  const [location, setLocation] = useState<Coordinates>(SA_DEFAULT_CENTER);
  const [motion, setMotion] = useState<MotionState>({ heading: 0, speed: 0 });
  const [error, setError] = useState<string | null>(null);
  const previous = useRef<{ point: Coordinates; at: number } | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const nextPoint = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        const now = Date.now();

        if (previous.current) {
          const heading = headingFromDelta(previous.current.point, nextPoint);
          const deltaSeconds = Math.max(1, (now - previous.current.at) / 1000);
          const speed =
            position.coords.speed && Number.isFinite(position.coords.speed)
              ? Math.max(0, position.coords.speed)
              : Math.max(
                  0,
                  Math.sqrt(
                    (nextPoint.lat - previous.current.point.lat) ** 2 +
                      (nextPoint.lng - previous.current.point.lng) ** 2
                  ) * 111_111 / deltaSeconds
                );

          setMotion({ heading, speed: Number(speed.toFixed(2)) });
        }

        previous.current = { point: nextPoint, at: now };
        setLocation(nextPoint);
      },
      (geoError) => {
        setError(geoError.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 20_000,
        timeout: 15_000
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  return useMemo(
    () => ({
      location,
      motion,
      locationError: error
    }),
    [location, motion, error]
  );
}
