"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchPermissionInfo } from "@/lib/api";
import { PageFrame } from "@/components/page-frame";

type PermissionState = "granted" | "denied" | "prompt" | "unsupported";

async function requestMotionPermission(): Promise<PermissionState> {
  const eventWithPermission = DeviceMotionEvent as typeof DeviceMotionEvent & {
    requestPermission?: () => Promise<"granted" | "denied">;
  };

  if (typeof eventWithPermission.requestPermission !== "function") {
    return "unsupported";
  }

  const result = await eventWithPermission.requestPermission();
  return result === "granted" ? "granted" : "denied";
}

export default function OnboardingPage() {
  const [info, setInfo] = useState<{
    permissions: Record<string, string>;
    privacy: { policy: string };
  } | null>(null);
  const [states, setStates] = useState<Record<string, PermissionState>>({});

  useEffect(() => {
    void fetchPermissionInfo().then((next) => setInfo(next));
  }, []);

  const rows = useMemo(() => {
    if (!info) {
      return [];
    }

    return [
      {
        key: "locationForeground",
        label: "Location (Foreground)",
        onRequest: async () => {
          return new Promise<PermissionState>((resolve) => {
            navigator.geolocation.getCurrentPosition(
              () => resolve("granted"),
              () => resolve("denied")
            );
          });
        }
      },
      {
        key: "locationBackground",
        label: "Location (Background)",
        onRequest: async () => {
          return "prompt";
        }
      },
      {
        key: "notifications",
        label: "Notifications",
        onRequest: async () => {
          if (!("Notification" in window)) {
            return "unsupported";
          }
          const result = await Notification.requestPermission();
          if (result === "granted") {
            return "granted";
          }
          if (result === "denied") {
            return "denied";
          }
          return "prompt";
        }
      },
      {
        key: "motionActivity",
        label: "Motion / Activity",
        onRequest: requestMotionPermission
      },
      {
        key: "cameraUploadOnly",
        label: "Camera (Upload only)",
        onRequest: async () => {
          if (!navigator.mediaDevices?.getUserMedia) {
            return "unsupported";
          }

          try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            stream.getTracks().forEach((track) => track.stop());
            return "granted";
          } catch {
            return "denied";
          }
        }
      }
    ];
  }, [info]);

  return (
    <PageFrame>
      <section>
        <h2>Permissions & Consent</h2>
        <p className="muted">Explicit opt-in is required before Sentinel background features are activated.</p>
        <p>{info?.privacy.policy}</p>
      </section>

      <ul className="permissions-list">
        {rows.map((row) => (
          <li key={row.key} className="permission-card">
            <h3>{row.label}</h3>
            <p>{info?.permissions[row.key]}</p>
            <button
              type="button"
              onClick={async () => {
                const status = await row.onRequest();
                setStates((current) => ({ ...current, [row.key]: status }));
              }}
            >
              Request
            </button>
            <p className="smallcaps">Status: {states[row.key] ?? "not requested"}</p>
          </li>
        ))}
      </ul>
    </PageFrame>
  );
}
