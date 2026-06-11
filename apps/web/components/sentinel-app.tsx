"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createVisionSession, getLatestVisionFrame, submitVisionFeedback, uploadVisionFrame, type VisionLatestFrame } from "../lib/api-client";
import { config } from "../lib/config";
import styles from "./sentinel-app.module.css";

type Mode = "camera" | "viewer";
type LatchedAlert = {
  threatLevel: "low" | "elevated" | "high" | "critical";
  alertReason: string;
  title: string;
  threatRating: number;
  expiresAt: number;
};

type AlertSnapshot = {
  imageDataUrl: string;
  capturedAt: string;
  title: string;
  alertReason: string;
  threatLevel: "low" | "elevated" | "high" | "critical";
  threatRating: number;
  sessionId: string | null;
};

type BehaviorLabel =
  | "person_vaping"
  | "person_with_possible_knife"
  | "fire_or_smoke_hazard"
  | "aggressive_body_language"
  | "distress_facial_expression"
  | "audio_threat_signal"
  | "theft_or_shoplifting"
  | "face_obscured"
  | "evasion"
  | "impersonation"
  | "verbal_threats"
  | "concealment";

function behaviorPriority(label: BehaviorLabel): number {
  const ranking: Record<BehaviorLabel, number> = {
    person_with_possible_knife: 12,
    fire_or_smoke_hazard: 11,
    theft_or_shoplifting: 10,
    impersonation: 9,
    verbal_threats: 8,
    concealment: 7,
    face_obscured: 6,
    evasion: 5,
    aggressive_body_language: 4,
    audio_threat_signal: 3,
    distress_facial_expression: 2,
    person_vaping: 1
  };
  return ranking[label] ?? 0;
}

function behaviorTitle(label: BehaviorLabel) {
  switch (label) {
    case "person_vaping":
      return "PERSON VAPING";
    case "person_with_possible_knife":
      return "POSSIBLE KNIFE";
    case "fire_or_smoke_hazard":
      return "FIRE OR SMOKE HAZARD";
    case "aggressive_body_language":
      return "AGGRESSIVE BODY LANGUAGE";
    case "distress_facial_expression":
      return "DISTRESS FACIAL EXPRESSION";
    case "audio_threat_signal":
      return "AUDIO THREAT SIGNAL";
    case "theft_or_shoplifting":
      return "THEFT OR SHOPLIFTING";
    case "face_obscured":
      return "FACE OBSCURED / MASKED";
    case "evasion":
      return "EVASION / SUSPICIOUS LOITERING";
    case "impersonation":
      return "OFFICIAL IMPERSONATION";
    case "verbal_threats":
      return "VERBAL THREATS";
    case "concealment":
      return "SUSPICIOUS CONCEALMENT";
    default:
      return "THREAT SIGNAL";
  }
}

const missedThreatOptions: Array<{ label: BehaviorLabel; button: string }> = [
  { label: "person_vaping", button: "Missed Vaping" },
  { label: "person_with_possible_knife", button: "Missed Knife" },
  { label: "fire_or_smoke_hazard", button: "Missed Fire/Smoke" },
  { label: "aggressive_body_language", button: "Missed Aggression" },
  { label: "distress_facial_expression", button: "Missed Distress" },
  { label: "audio_threat_signal", button: "Missed Audio Threat" },
  { label: "theft_or_shoplifting", button: "Missed Shoplifting" },
  { label: "face_obscured", button: "Missed Masked Face" },
  { label: "evasion", button: "Missed Evasion" },
  { label: "impersonation", button: "Missed Impersonation" },
  { label: "verbal_threats", button: "Missed Verbal Threat" },
  { label: "concealment", button: "Missed Concealment" }
];

function computeMetrics(current: Uint8ClampedArray, previous: Uint8ClampedArray | null) {
  let sumLuma = 0;
  let sumContrastDelta = 0;
  let edgeCount = 0;
  let previousLuma = 0;
  let motionSum = 0;
  let hazePixelCount = 0;
  let fireLikePixelCount = 0;

  const pixelCount = current.length / 4;

  for (let i = 0; i < current.length; i += 4) {
    const r = current[i] ?? 0;
    const g = current[i + 1] ?? 0;
    const b = current[i + 2] ?? 0;
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;
    const maxC = Math.max(r, g, b);
    const minC = Math.min(r, g, b);
    const saturation = maxC === 0 ? 0 : (maxC - minC) / maxC;
    sumLuma += luma;
    sumContrastDelta += Math.abs(luma - 128);
    if (luma > 150 && saturation < 0.22) {
      hazePixelCount += 1;
    }
    if (r > 145 && g > 50 && b < 170 && r > g * 1.08 && g >= b * 0.86 && saturation > 0.18) {
      fireLikePixelCount += 1;
    }

    if (i > 0) {
      if (Math.abs(luma - previousLuma) > 26) {
        edgeCount += 1;
      }
    }
    previousLuma = luma;

    if (previous) {
      const pr = previous[i] ?? 0;
      const pg = previous[i + 1] ?? 0;
      const pb = previous[i + 2] ?? 0;
      const pluma = 0.299 * pr + 0.587 * pg + 0.114 * pb;
      motionSum += Math.abs(luma - pluma);
    }
  }

  const brightness = Math.min(1, Math.max(0, sumLuma / pixelCount / 255));
  const edgeDensity = Math.min(1, Math.max(0, edgeCount / pixelCount));
  const motion = previous ? Math.min(1, Math.max(0, motionSum / pixelCount / 255)) : 0;
  const contrast = Math.min(1, Math.max(0, sumContrastDelta / pixelCount / 128));
  const haze = Math.min(1, Math.max(0, hazePixelCount / pixelCount));
  const fireLike = Math.min(1, Math.max(0, (fireLikePixelCount / pixelCount) * 3.4));

  return { brightness, edgeDensity, motion, contrast, haze, fireLike };
}

export function SentinelApp() {
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<Mode>("camera");
  const [hudTime, setHudTime] = useState("");

  useEffect(() => {
    let animationFrameId: number;
    const updateTime = () => {
      const now = new Date();
      const yr = now.getFullYear();
      const mo = String(now.getMonth() + 1).padStart(2, "0");
      const dy = String(now.getDate()).padStart(2, "0");
      const hr = String(now.getHours()).padStart(2, "0");
      const mn = String(now.getMinutes()).padStart(2, "0");
      const sc = String(now.getSeconds()).padStart(2, "0");
      const ms = String(now.getMilliseconds()).padStart(3, "0");
      setHudTime(`${yr}-${mo}-${dy} ${hr}:${mn}:${sc}.${ms}`);
      animationFrameId = requestAnimationFrame(updateTime);
    };
    updateTime();
    return () => cancelAnimationFrame(animationFrameId);
  }, []);
  const [isSecureContextMode, setIsSecureContextMode] = useState(true);
  const [sessionInput, setSessionInput] = useState("");
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [status, setStatus] = useState("Idle");
  const [error, setError] = useState<string | null>(null);
  const [latestFrame, setLatestFrame] = useState<VisionLatestFrame | null>(null);
  const [latchedAlert, setLatchedAlert] = useState<LatchedAlert | null>(null);
  const [alertSnapshot, setAlertSnapshot] = useState<AlertSnapshot | null>(null);
  const [lastSentAt, setLastSentAt] = useState<string>("-");
  const [shareUrl, setShareUrl] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState<string>("");
  const [modelProvider, setModelProvider] = useState<"openrouter" | "openai" | "groq">("groq");
  const [runtimeApiKey, setRuntimeApiKey] = useState("");
  const [runtimeModel, setRuntimeModel] = useState("meta-llama/llama-4-scout-17b-16e-instruct");
  const [micStatus, setMicStatus] = useState<"off" | "active" | "unavailable">("off");
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [alertHistory, setAlertHistory] = useState<Array<{
    id: string;
    timestamp: string;
    threatLevel: "low" | "elevated" | "high" | "critical";
    threatRating: number;
    alertReason: string;
    imageDataUrl: string;
    title: string;
  }>>([]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const processCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const uploadIntervalRef = useRef<number | null>(null);
  const pollIntervalRef = useRef<number | null>(null);
  const previousPixelsRef = useRef<Uint8ClampedArray | null>(null);
  const previousBrightnessRef = useRef<number | null>(null);
  const lastAlertFrameRef = useRef<string | null>(null);
  const lastAlertAtRef = useRef<number>(0);
  const lastAlertBehaviorRef = useRef<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioAnalyserRef = useRef<AnalyserNode | null>(null);
  const audioBufferRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const previousAudioPeakRef = useRef<number>(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setIsSecureContextMode(window.isSecureContext);
  }, []);

  useEffect(() => {
    const savedProvider = window.localStorage.getItem("vision.provider");
    const savedModel = window.localStorage.getItem("vision.model");
    const savedKey = window.localStorage.getItem("vision.key");

    if (savedProvider === "openrouter" || savedProvider === "openai" || savedProvider === "groq") {
      setModelProvider(savedProvider);
    }
    if (savedModel) {
      setRuntimeModel(savedModel);
    }
    if (savedKey) {
      setRuntimeApiKey(savedKey);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("vision.provider", modelProvider);
  }, [modelProvider]);

  useEffect(() => {
    window.localStorage.setItem("vision.model", runtimeModel);
  }, [runtimeModel]);

  useEffect(() => {
    if (!runtimeApiKey.trim()) {
      window.localStorage.removeItem("vision.key");
      return;
    }
    window.localStorage.setItem("vision.key", runtimeApiKey.trim());
  }, [runtimeApiKey]);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    void navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        void registration.unregister();
      }
    });
  }, []);

  const playAlertTone = useCallback(() => {
    const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) {
      return;
    }

    const ctx = new AudioCtx();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "square";
    oscillator.frequency.value = 880;
    gain.gain.value = 0.09;
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.18);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("session");
    if (fromUrl) {
      const sanitized = fromUrl.toUpperCase();
      setMode("viewer");
      setSessionInput(sanitized);
      setActiveSessionId(sanitized);
    }
  }, []);

  useEffect(() => {
    if (!activeSessionId) {
      setShareUrl("");
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.set("session", activeSessionId);
    setShareUrl(url.toString());
  }, [activeSessionId]);

  const teardownAudioCapture = useCallback(() => {
    if (audioSourceRef.current) {
      audioSourceRef.current.disconnect();
      audioSourceRef.current = null;
    }

    if (audioAnalyserRef.current) {
      audioAnalyserRef.current.disconnect();
      audioAnalyserRef.current = null;
    }

    audioBufferRef.current = null;
    previousAudioPeakRef.current = 0;

    if (audioContextRef.current) {
      void audioContextRef.current.close().catch(() => undefined);
      audioContextRef.current = null;
    }
  }, []);

  const setupAudioCapture = useCallback(
    async (stream: MediaStream): Promise<boolean> => {
      const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx || stream.getAudioTracks().length === 0) {
        return false;
      }

      teardownAudioCapture();

      const context = new AudioCtx();
      if (context.state === "suspended") {
        await context.resume().catch(() => undefined);
      }

      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.14;
      source.connect(analyser);

      audioContextRef.current = context;
      audioSourceRef.current = source;
      audioAnalyserRef.current = analyser;
      audioBufferRef.current = new Uint8Array(new ArrayBuffer(analyser.fftSize));
      previousAudioPeakRef.current = 0;
      return true;
    },
    [teardownAudioCapture]
  );

  const readAudioMetrics = useCallback(() => {
    const analyser = audioAnalyserRef.current;
    const samples = audioBufferRef.current;

    if (!analyser || !samples) {
      return {
        audioRms: 0,
        audioPeak: 0,
        audioSpike: 0
      };
    }

    analyser.getByteTimeDomainData(samples);
    let sumSquares = 0;
    let peak = 0;

    for (let i = 0; i < samples.length; i += 1) {
      const sample = ((samples[i] ?? 128) - 128) / 128;
      const absValue = Math.abs(sample);
      sumSquares += sample * sample;
      if (absValue > peak) {
        peak = absValue;
      }
    }

    const rms = Math.sqrt(sumSquares / samples.length);
    const audioRms = Number(Math.min(1, rms * 5.5).toFixed(3));
    const audioPeak = Number(Math.min(1, peak * 1.8).toFixed(3));
    const audioSpike = Number(Math.min(1, Math.max(0, (audioPeak - previousAudioPeakRef.current) * 3.1)).toFixed(3));
    previousAudioPeakRef.current = audioPeak;

    return {
      audioRms,
      audioPeak,
      audioSpike
    };
  }, []);

  const stopStreaming = useCallback(() => {
    if (uploadIntervalRef.current) {
      window.clearInterval(uploadIntervalRef.current);
      uploadIntervalRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    previousPixelsRef.current = null;
    previousBrightnessRef.current = null;
    teardownAudioCapture();
    setMicStatus("off");
    setIsStreaming(false);
    setStatus("Camera stopped");
  }, [teardownAudioCapture]);

  const startCameraSession = useCallback(async () => {
    try {
      setError(null);
      setStatus("Creating session...");

      if (!navigator.mediaDevices?.getUserMedia) {
        const secureHint = window.isSecureContext
          ? "This browser does not expose camera APIs for this page."
          : "Camera access requires HTTPS or localhost. Open the app over HTTPS on your phone.";
        throw new Error(`Camera unavailable: ${secureHint}`);
      }

      const desired = sessionInput.trim() ? sessionInput.trim().toUpperCase() : undefined;
      const { sessionId } = await createVisionSession(desired);
      setActiveSessionId(sessionId);
      setSessionInput(sessionId);

      const videoConstraints: MediaTrackConstraints = {
        facingMode: facingMode,
        width: { ideal: 640 },
        height: { ideal: 480 }
      };

      let media: MediaStream;
      try {
        media = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false
          }
        });
      } catch {
        media = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
          audio: false
        });
      }

      let micActive = false;
      try {
        micActive = await setupAudioCapture(media);
      } catch {
        micActive = false;
      }
      if (!micActive && media.getAudioTracks().length > 0) {
        media.getAudioTracks().forEach((track) => {
          track.stop();
          media.removeTrack(track);
        });
      }

      const streamModeLabel = micActive ? "mic active" : "camera only";
      setMicStatus(micActive ? "active" : "unavailable");
      if (micActive) {
        setFeedbackStatus("");
      } else {
        setFeedbackStatus("Microphone unavailable. AI listening metrics are disabled for this sender.");
      }

      streamRef.current = media;
      if (videoRef.current) {
        videoRef.current.srcObject = media;
        await videoRef.current.play();
      }

      setStatus(`Streaming as ${sessionId} (${streamModeLabel})`);
      setIsStreaming(true);

      uploadIntervalRef.current = window.setInterval(async () => {
        const session = sessionId;
        const video = videoRef.current;
        const previewCanvas = previewCanvasRef.current;
        const processCanvas = processCanvasRef.current;

        if (!video || !previewCanvas || !processCanvas || video.videoWidth === 0 || video.videoHeight === 0) {
          return;
        }

        const width = 320;
        const height = 240;

        previewCanvas.width = width;
        previewCanvas.height = height;
        processCanvas.width = width;
        processCanvas.height = height;

        const previewCtx = previewCanvas.getContext("2d", { willReadFrequently: true });
        const processCtx = processCanvas.getContext("2d", { willReadFrequently: true });

        if (!previewCtx || !processCtx) {
          return;
        }

        previewCtx.drawImage(video, 0, 0, width, height);
        processCtx.drawImage(video, 0, 0, width, height);

        const imageData = processCtx.getImageData(0, 0, width, height);
        const baseMetrics = computeMetrics(imageData.data, previousPixelsRef.current);
        const audioMetrics = readAudioMetrics();
        const flicker = previousBrightnessRef.current === null ? 0 : Math.min(1, Math.abs(baseMetrics.brightness - previousBrightnessRef.current) * 3);
        const metrics = {
          ...baseMetrics,
          ...audioMetrics,
          flicker
        };
        previousBrightnessRef.current = baseMetrics.brightness;
        previousPixelsRef.current = new Uint8ClampedArray(imageData.data);
        const imageDataUrl = previewCanvas.toDataURL("image/jpeg", 0.65);

        try {
          const result = await uploadVisionFrame({
            sessionId: session,
            imageDataUrl,
            capturedAt: new Date().toISOString(),
            metrics,
            runtime: runtimeApiKey.trim()
              ? {
                  provider: modelProvider,
                  apiKey: runtimeApiKey.trim(),
                  model: runtimeModel.trim() || undefined
                }
              : undefined
          });

          setLatestFrame((current) => ({
            frameId: result.frameId,
            imageDataUrl,
            capturedAt: new Date().toISOString(),
            receivedAt: result.receivedAt,
            metrics,
            analysis: result.analysis
          }));
          setLastSentAt(new Date().toLocaleTimeString());
          setStatus(`Streaming as ${session} (${streamModeLabel})`);
        } catch (streamError) {
          setError(streamError instanceof Error ? streamError.message : "Frame upload failed");
        }
      }, 550);
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : "Could not start camera");
      setStatus("Failed to start camera");
      stopStreaming();
    }
  }, [modelProvider, readAudioMetrics, runtimeApiKey, runtimeModel, sessionInput, setupAudioCapture, stopStreaming, facingMode]);

  const flipCamera = useCallback(async () => {
    const nextFacing = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextFacing);

    if (isStreaming) {
      try {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
        if (uploadIntervalRef.current) {
          window.clearInterval(uploadIntervalRef.current);
          uploadIntervalRef.current = null;
        }
        teardownAudioCapture();
        setMicStatus("off");

        const videoConstraints: MediaTrackConstraints = {
          facingMode: nextFacing,
          width: { ideal: 640 },
          height: { ideal: 480 }
        };

        let media: MediaStream;
        try {
          media = await navigator.mediaDevices.getUserMedia({
            video: videoConstraints,
            audio: {
              echoCancellation: false,
              noiseSuppression: false,
              autoGainControl: false
            }
          });
        } catch {
          media = await navigator.mediaDevices.getUserMedia({
            video: videoConstraints,
            audio: false
          });
        }

        let micActive = false;
        try {
          micActive = await setupAudioCapture(media);
        } catch {
          micActive = false;
        }
        if (!micActive && media.getAudioTracks().length > 0) {
          media.getAudioTracks().forEach((track) => {
            track.stop();
            media.removeTrack(track);
          });
        }

        const streamModeLabel = micActive ? "mic active" : "camera only";
        setMicStatus(micActive ? "active" : "unavailable");
        if (micActive) {
          setFeedbackStatus("");
        } else {
          setFeedbackStatus("Microphone unavailable. AI listening metrics are disabled for this sender.");
        }

        streamRef.current = media;
        if (videoRef.current) {
          videoRef.current.srcObject = media;
          await videoRef.current.play();
        }

        const session = activeSessionId;
        if (!session) return;

        setStatus(`Streaming as ${session} (${streamModeLabel})`);

        uploadIntervalRef.current = window.setInterval(async () => {
          const video = videoRef.current;
          const previewCanvas = previewCanvasRef.current;
          const processCanvas = processCanvasRef.current;

          if (!video || !previewCanvas || !processCanvas || video.videoWidth === 0 || video.videoHeight === 0) {
            return;
          }

          const width = 320;
          const height = 240;

          previewCanvas.width = width;
          previewCanvas.height = height;
          processCanvas.width = width;
          processCanvas.height = height;

          const previewCtx = previewCanvas.getContext("2d", { willReadFrequently: true });
          const processCtx = processCanvas.getContext("2d", { willReadFrequently: true });

          if (!previewCtx || !processCtx) {
            return;
          }

          previewCtx.drawImage(video, 0, 0, width, height);
          processCtx.drawImage(video, 0, 0, width, height);

          const imageData = processCtx.getImageData(0, 0, width, height);
          const baseMetrics = computeMetrics(imageData.data, previousPixelsRef.current);
          const audioMetrics = readAudioMetrics();
          const flicker = previousBrightnessRef.current === null ? 0 : Math.min(1, Math.abs(baseMetrics.brightness - previousBrightnessRef.current) * 3);
          const metrics = {
            ...baseMetrics,
            ...audioMetrics,
            flicker
          };
          previousBrightnessRef.current = baseMetrics.brightness;
          previousPixelsRef.current = new Uint8ClampedArray(imageData.data);
          const imageDataUrl = previewCanvas.toDataURL("image/jpeg", 0.65);

          try {
            const result = await uploadVisionFrame({
              sessionId: session,
              imageDataUrl,
              capturedAt: new Date().toISOString(),
              metrics,
              runtime: runtimeApiKey.trim()
                ? {
                    provider: modelProvider,
                    apiKey: runtimeApiKey.trim(),
                    model: runtimeModel.trim() || undefined
                  }
                : undefined
            });

            setLatestFrame((current) => ({
              frameId: result.frameId,
              imageDataUrl,
              capturedAt: new Date().toISOString(),
              receivedAt: result.receivedAt,
              metrics,
              analysis: result.analysis
            }));
            setLastSentAt(new Date().toLocaleTimeString());
            setStatus(`Streaming as ${session} (${streamModeLabel})`);
          } catch (streamError) {
            setError(streamError instanceof Error ? streamError.message : "Frame upload failed");
          }
        }, 550);
      } catch (startError) {
        setError(startError instanceof Error ? startError.message : "Could not start camera");
        setStatus("Failed to start camera");
        stopStreaming();
      }
    }
  }, [facingMode, isStreaming, activeSessionId, teardownAudioCapture, setupAudioCapture, readAudioMetrics, runtimeApiKey, modelProvider, runtimeModel, stopStreaming]);

  const startViewer = useCallback(async () => {
    const session = sessionInput.trim().toUpperCase();
    if (!session) {
      setError("Enter a session code first.");
      return;
    }

    setError(null);
    setActiveSessionId(session);
    setStatus(`Watching ${session}`);

    const fetchFrame = async () => {
      try {
        const payload = await getLatestVisionFrame(session);
        setLatestFrame(payload.frame);
        if (payload.frame.analysis.shouldAlert) {
          setStatus(`THREAT ${payload.frame.analysis.threatLevel.toUpperCase()} detected in ${session}`);
        } else {
          setStatus(`Watching ${session}`);
        }
      } catch (pollError) {
        const message = pollError instanceof Error ? pollError.message : "Viewer fetch failed";
        if (message.includes("(404)")) {
          setStatus(`Waiting for first frame from ${session}`);
          return;
        }
        setError(message);
      }
    };

    await fetchFrame();

    if (pollIntervalRef.current) {
      window.clearInterval(pollIntervalRef.current);
    }

    pollIntervalRef.current = window.setInterval(() => {
      void fetchFrame();
    }, 400);
  }, [sessionInput]);

  useEffect(() => {
    if (!latestFrame?.analysis.shouldAlert) {
      return;
    }

    const isNewFrame = lastAlertFrameRef.current !== latestFrame.frameId;
    if (isNewFrame) {
      const now = Date.now();
      const sortedBehaviors = [...latestFrame.analysis.detectedBehaviors].sort((a, b) => {
        const priorityA = behaviorPriority(a.label);
        const priorityB = behaviorPriority(b.label);
        if (priorityB !== priorityA) {
          return priorityB - priorityA;
        }
        return b.confidence - a.confidence;
      });
      const primaryBehavior = sortedBehaviors[0];
      const alertTitle = primaryBehavior ? behaviorTitle(primaryBehavior.label) : `ALERT ${latestFrame.analysis.threatLevel.toUpperCase()}`;
      const behaviorLabel = primaryBehavior?.label ?? latestFrame.analysis.alertReason;
      
      const behaviorChanged = lastAlertBehaviorRef.current !== behaviorLabel;
      const cooldownPassed = now - lastAlertAtRef.current > 15000;

      if (!latchedAlert && (behaviorChanged || cooldownPassed)) {
        lastAlertFrameRef.current = latestFrame.frameId;
        lastAlertAtRef.current = now;
        lastAlertBehaviorRef.current = behaviorLabel;

        const newAlert = {
          id: `${latestFrame.frameId}-${now}`,
          timestamp: new Date().toLocaleTimeString(),
          threatLevel: latestFrame.analysis.threatLevel,
          threatRating: latestFrame.analysis.threatRating,
          alertReason: latestFrame.analysis.alertReason,
          imageDataUrl: latestFrame.imageDataUrl,
          title: alertTitle
        };

        setLatchedAlert({
          threatLevel: latestFrame.analysis.threatLevel,
          alertReason: latestFrame.analysis.alertReason,
          title: alertTitle,
          threatRating: latestFrame.analysis.threatRating,
          expiresAt: now + 3000
        });

        setAlertHistory((prev) => [newAlert, ...prev]);
        setAlertSnapshot({
          imageDataUrl: latestFrame.imageDataUrl,
          capturedAt: latestFrame.capturedAt,
          title: alertTitle,
          alertReason: latestFrame.analysis.alertReason,
          threatLevel: latestFrame.analysis.threatLevel,
          threatRating: latestFrame.analysis.threatRating,
          sessionId: activeSessionId
        });
        playAlertTone();
      }
    }
  }, [latestFrame, latchedAlert, playAlertTone]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setLatchedAlert((current) => {
        if (!current) {
          return current;
        }
        if (current.expiresAt <= Date.now()) {
          return null;
        }
        return current;
      });
    }, 500);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    return () => {
      stopStreaming();
      if (pollIntervalRef.current) {
        window.clearInterval(pollIntervalRef.current);
      }
    };
  }, [stopStreaming]);

  const sendFeedback = useCallback(
    async (feedbackType: "false_alarm" | "missed_threat", expectedBehavior?: BehaviorLabel | "other") => {
      if (!activeSessionId) {
        setFeedbackStatus("Connect a session before sending feedback.");
        return;
      }

      try {
        const response = await submitVisionFeedback({
          sessionId: activeSessionId,
          frameId: latestFrame?.frameId,
          feedbackType,
          expectedBehavior
        });
        setFeedbackStatus(`Feedback saved (${response.feedbackId.slice(-6)}).`);
      } catch (feedbackError) {
        setFeedbackStatus(feedbackError instanceof Error ? feedbackError.message : "Could not send feedback.");
      }
    },
    [activeSessionId, latestFrame?.frameId]
  );

  if (!mounted) {
    return null;
  }

  const flashDashboard = Boolean(latchedAlert && ["high", "critical"].includes(latchedAlert.threatLevel));

  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.indicatorPulse} />
          <h1 className={styles.brandTitle}>Sentinel AI</h1>
        </div>
        <p className={styles.brandSubtitle}>Live Camera Feed Safety & Threat Analysis Panel</p>
      </header>

      {latchedAlert ? (
        <div className={`${styles.alertBanner} ${styles[`alert${latchedAlert.threatLevel}`]}`}>
          <div className={styles.alertHeader}>
            <span className={styles.alertDot} />
            <span className={styles.alertTitleText}>{latchedAlert.title} DETECTED</span>
          </div>
          <p className={styles.alertDescription}>
            {latchedAlert.alertReason} (Threat Rating: {latchedAlert.threatRating}%)
          </p>
        </div>
      ) : null}

      <div className={styles.workspace}>
        {/* Left Column: Live Monitor */}
        <section className={styles.monitorSection}>
          <div className={`${styles.screenContainer} ${latestFrame?.analysis.shouldAlert ? styles.screenContainerAlerting : ""}`}>
            {latestFrame ? (
              <img src={latestFrame.imageDataUrl} alt="Live feed" className={styles.liveFeedImage} />
            ) : (
              <div className={styles.feedPlaceholder}>
                <div className={styles.placeholderIcon}>🎥</div>
                <p>No active feed connected</p>
                <span className={styles.placeholderSub}>Start camera sender on phone or connect viewer on laptop</span>
              </div>
            )}


            
            {/* Live HUD Overlay Status Bar */}
            <div className={styles.hudOverlay}>
              <div className={styles.hudLeft}>
                <span className={styles.hudPill}>
                  <span className={`${styles.statusDot} ${latestFrame ? styles.statusDotActive : ""}`} />
                  {latestFrame ? "Live Stream" : "Disconnected"}
                </span>
                {activeSessionId ? (
                  <span className={styles.hudPill}>Session: {activeSessionId}</span>
                ) : null}
              </div>
              <div className={styles.hudRight}>
                <span className={styles.hudPill}>Mode: {mode.toUpperCase()}</span>
                {micStatus === "active" ? (
                  <span className={styles.hudPill}>🎤 Audio Active</span>
                ) : null}
              </div>
            </div>
          </div>

          {/* Threat Score & Summary */}
          <div className={styles.threatDashboard}>
            <div className={styles.threatSummaryRow}>
              <div className={styles.threatLabelBlock}>
                <span className={styles.threatLabel}>Safety Threat Level</span>
                <span className={`${styles.threatValue} ${styles[`text${latestFrame?.analysis.threatLevel ?? "low"}`]}`}>
                  {latestFrame ? latestFrame.analysis.threatLevel.toUpperCase() : "STABLE"}
                  {latestFrame ? ` (${latestFrame.analysis.threatRating}%)` : ""}
                </span>
              </div>
              {latestFrame ? (
                <span className={styles.modelNamePill}>{latestFrame.analysis.analysisModel}</span>
              ) : null}
            </div>

            <div className={styles.dangerProgressContainer}>
              <div
                className={`${styles.dangerProgressBar} ${styles[`bg${latestFrame?.analysis.threatLevel ?? "low"}`]}`}
                style={{ width: `${latestFrame ? latestFrame.analysis.threatRating : 0}%` }}
              />
            </div>

            <div className={styles.analysisSummaryText}>
              {latestFrame ? latestFrame.analysis.summary : "Connect a session to start visual and audio threat modeling."}
            </div>
          </div>
        </section>

        {/* Right Column: Console & Alert History */}
        <section className={styles.consoleSection}>
          {/* Controls Card */}
          <div className={styles.cardPanel}>
            <h2 className={styles.panelHeader}>Control Console</h2>
            
            <div className={styles.controlRow}>
              <button
                type="button"
                className={`${styles.btnTab} ${mode === "camera" ? styles.btnTabActive : ""}`}
                onClick={() => setMode("camera")}
              >
                Camera Sender
              </button>
              <button
                type="button"
                className={`${styles.btnTab} ${mode === "viewer" ? styles.btnTabActive : ""}`}
                onClick={() => setMode("viewer")}
              >
                Viewer Monitor
              </button>
            </div>

            {mode === "camera" && !isSecureContextMode ? (
              <p className={styles.warningAlert}>Camera requires a secure HTTPS context on phone.</p>
            ) : null}

            {/* Inputs & Actions */}
            <div className={styles.inputGroup}>
              <input
                value={sessionInput}
                onChange={(event) => setSessionInput(event.currentTarget.value.toUpperCase())}
                placeholder="Session Code (e.g. ABCD12)"
                className={styles.inputField}
              />
              <div className={styles.actionRow}>
                {mode === "camera" ? (
                  <>
                    <button type="button" className={styles.btnPrimary} onClick={() => void startCameraSession()} disabled={isStreaming}>
                      Start Camera
                    </button>
                    <button type="button" className={styles.btnClear} onClick={() => void flipCamera()} title="Toggle Front/Rear Camera">
                      Flip ({facingMode === "environment" ? "Rear" : "Front"})
                    </button>
                  </>
                ) : (
                  <button type="button" className={styles.btnPrimary} onClick={() => void startViewer()}>
                    Connect Viewer
                  </button>
                )}
                {isStreaming || pollIntervalRef.current ? (
                  <button type="button" className={styles.btnSecondary} onClick={stopStreaming}>
                    Stop Session
                  </button>
                ) : null}
              </div>
            </div>

            {/* API settings collapsible/compact details */}
            <details className={styles.settingsAccordion}>
              <summary className={styles.settingsSummary}>Advanced API Configuration</summary>
              <div className={styles.accordionContent}>
                <div className={styles.modelGrid}>
                  <select
                    className={styles.inputField}
                    value={modelProvider}
                    onChange={(event) => {
                      const next = event.currentTarget.value as "openai" | "openrouter" | "groq";
                      setModelProvider(next);
                      if (next === "openai") {
                        setRuntimeModel("gpt-4.1-mini");
                      } else if (next === "openrouter") {
                        setRuntimeModel("openai/gpt-4o-mini");
                      } else {
                        setRuntimeModel("llama-3.2-11b-vision-preview");
                      }
                    }}
                  >
                    <option value="groq">Groq (Ultra-Fast)</option>
                    <option value="openrouter">OpenRouter</option>
                    <option value="openai">OpenAI</option>
                  </select>
                  <input
                    value={runtimeModel}
                    onChange={(event) => setRuntimeModel(event.currentTarget.value)}
                    placeholder="Model ID"
                    className={styles.inputField}
                  />
                </div>
                <div className={styles.apiKeyRow}>
                  <input
                    value={runtimeApiKey}
                    onChange={(event) => setRuntimeApiKey(event.currentTarget.value)}
                    placeholder="Paste OpenAI/OpenRouter API key"
                    type="password"
                    className={styles.inputField}
                  />
                  {runtimeApiKey ? (
                    <button type="button" className={styles.btnClear} onClick={() => setRuntimeApiKey("")}>
                      Clear
                    </button>
                  ) : null}
                </div>
              </div>
            </details>

            {/* Connection guide details */}
            <details className={styles.settingsAccordion}>
              <summary className={styles.settingsSummary}>Device Connection Guide</summary>
              <div className={styles.accordionContent}>
                <ol className={styles.guideList}>
                  <li>
                    <strong>Expose:</strong> Start a secure tunnel (Serveo/ngrok) to expose your local port 3000.
                  </li>
                  <li>
                    <strong>Connect Phone:</strong> Open the tunnel URL on your phone browser, choose <strong>Camera Sender</strong>, enter your API key, and click <strong>Start Camera</strong> to generate a 6-letter Session Code.
                  </li>
                  <li>
                    <strong>Connect Laptop:</strong> Choose <strong>Viewer Monitor</strong> on this laptop, enter the Session Code, and click <strong>Connect Viewer</strong>.
                  </li>
                </ol>
              </div>
            </details>

            {shareUrl ? (
              <div className={styles.sharePanel}>
                <span className={styles.shareLabel}>Mobile Camera Connection Link:</span>
                <a href={shareUrl} target="_blank" rel="noreferrer" className={styles.shareLink}>
                  {shareUrl}
                </a>
              </div>
            ) : null}

            {error ? <p className={styles.errorMessage}>{error}</p> : null}
          </div>

          {/* Alert Log History Feed */}
          <div className={styles.cardPanel}>
            <div className={styles.historyHeader}>
              <h2 className={styles.panelHeader}>Alert History log</h2>
              <span className={styles.historyCountBadge}>{alertHistory.length}</span>
            </div>
            
            <div className={styles.alertHistoryList}>
              {alertHistory.length > 0 ? (
                alertHistory.map((item) => (
                  <div key={item.id} className={styles.historyItemCard}>
                    <div className={styles.historyThumbnailContainer}>
                      <img src={item.imageDataUrl} alt="Alert snapshot" className={styles.historyThumbnail} />
                    </div>
                    <div className={styles.historyItemContent}>
                      <div className={styles.historyItemTitleRow}>
                        <span className={`${styles.historyItemTitle} ${styles[`text${item.threatLevel}`]}`}>
                          {item.title}
                        </span>
                        <span className={styles.historyItemTime}>{item.timestamp}</span>
                      </div>
                      <p className={styles.historyItemDescription}>{item.alertReason}</p>
                      <div className={styles.historyItemFooter}>
                        <span className={`${styles.severityBadge} ${styles[`alert${item.threatLevel}`]}`}>
                          Threat {item.threatRating}%
                        </span>
                        <a
                          href={item.imageDataUrl}
                          download={`alert-snapshot-${item.id}.jpg`}
                          className={styles.historyDownloadLink}
                        >
                          Download Frame
                        </a>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className={styles.historyEmpty}>
                  <p>No safety alerts captured yet.</p>
                  <span>Alert events will be recorded here in real-time as they are flagged by the AI.</span>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      <video ref={videoRef} className={styles.hidden} playsInline muted />
      <canvas ref={previewCanvasRef} className={styles.hidden} />
      <canvas ref={processCanvasRef} className={styles.hidden} />
    </main>
  );
}
