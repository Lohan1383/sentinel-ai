"use client";

import { FormEvent, useState } from "react";
import type { IncidentAssessment } from "@sentinel/shared";
import { reportIncident, uploadIncidentImage } from "@/lib/api";
import { useLocationTracking } from "@/lib/use-location";
import { PageFrame } from "@/components/page-frame";

export default function ReportPage() {
  const { location } = useLocationTracking();
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [assessment, setAssessment] = useState<IncidentAssessment | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) {
      setStatus("Select an image before submitting.");
      return;
    }

    setLoading(true);
    setStatus("Uploading image and running authenticity checks…");

    try {
      const upload = await uploadIncidentImage(file);
      const result = await reportIncident({
        userId: "demo-user",
        imageUrl: upload.imageUrl,
        description,
        location,
        capturedAt: new Date().toISOString()
      });

      setAssessment(result.assessment);
      setStatus(
        result.published
          ? "Report verified and published to feed."
          : "Report received but not published due to low confidence threshold."
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Report failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageFrame>
      <section>
        <h2>User Incident Reporting</h2>
        <p className="muted">
          Camera access is used only for explicit uploads. Submitted reports are evaluated by authenticity scoring.
        </p>
      </section>

      <form className="report-form" onSubmit={submit}>
        <label htmlFor="incident-image">
          Incident image
          <input
            id="incident-image"
            type="file"
            accept="image/*"
            required
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </label>

        <label htmlFor="incident-description">
          Description (optional)
          <textarea
            id="incident-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Describe what you observed"
            maxLength={400}
          />
        </label>

        <button type="submit" disabled={loading}>
          {loading ? "Processing…" : "Submit Incident"}
        </button>
      </form>

      {status ? <p>{status}</p> : null}

      {assessment ? (
        <section className="assessment-card">
          <h3>Authenticity Assessment</h3>
          <p>Confidence Score: {Math.round(assessment.confidenceScore * 100)}%</p>
          <p>Metadata Valid: {assessment.metadataValid ? "Yes" : "No"}</p>
          <p>Duplicate Likelihood: {Math.round(assessment.duplicateLikelihood * 100)}%</p>
          <p>Manipulation Likelihood: {Math.round(assessment.manipulationLikelihood * 100)}%</p>
          <p>Corroboration Score: {Math.round(assessment.corroborationScore * 100)}%</p>
          <ul>
            {assessment.rationale.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </PageFrame>
  );
}
