import { useState } from "react";
import type { GeoPoint, UserTier } from "@sentinel/shared";
import { uploadIncident } from "../lib/api-client";
import styles from "./sentinel-app.module.css";

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value = reader.result;
      if (typeof value !== "string") {
        reject(new Error("Failed to encode image"));
        return;
      }

      const base64 = value.split(",")[1];
      resolve(base64 ?? "");
    };
    reader.onerror = () => reject(reader.error ?? new Error("File read failed"));
    reader.readAsDataURL(file);
  });
}

interface IncidentReporterProps {
  location: GeoPoint;
  tier: UserTier;
  reporterId: string;
}

export function IncidentReporter({ location, tier, reporterId }: IncidentReporterProps) {
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string>("No report submitted yet.");
  const [submitting, setSubmitting] = useState(false);

  return (
    <div>
      <p className={styles.small}>Image + optional text. Location and timestamp are auto-attached.</p>
      <div className={styles.inlineRow}>
        <input
          className={styles.fileInput}
          type="file"
          accept="image/*"
          onChange={(event) => {
            setFile(event.currentTarget.files?.[0] ?? null);
          }}
        />
      </div>
      <textarea
        className={styles.textarea}
        placeholder="Optional incident context"
        value={description}
        onChange={(event) => {
          setDescription(event.currentTarget.value);
        }}
      />
      <div className={styles.inlineRow}>
        <button
          type="button"
          className={styles.submit}
          disabled={submitting || !file}
          onClick={async () => {
            if (!file) {
              return;
            }

            setSubmitting(true);
            setStatus("Uploading and running AI authenticity checks...");
            try {
              const imageBase64 = await fileToBase64(file);
              const response = await uploadIncident(
                {
                  reporterId,
                  imageBase64,
                  description: description.trim() || undefined,
                  location,
                  capturedAt: new Date().toISOString()
                },
                tier
              );

              setStatus(
                response.verification.shouldPublish
                  ? `Published. Confidence ${response.verification.confidenceScore}.`
                  : `Held for review. Confidence ${response.verification.confidenceScore}.`
              );
            } catch (error) {
              setStatus(error instanceof Error ? error.message : "Upload failed");
            } finally {
              setSubmitting(false);
            }
          }}
        >
          {submitting ? "Submitting..." : "Submit incident"}
        </button>
      </div>
      <p className={styles.small}>{status}</p>
    </div>
  );
}
