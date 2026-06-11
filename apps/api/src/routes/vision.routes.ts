import { Router } from "express";
import { z } from "zod";

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

type VoteCountMap = Record<BehaviorLabel, number>;
type VoteBoolMap = Record<BehaviorLabel, boolean>;

const behaviorLabels: BehaviorLabel[] = [
  "person_vaping",
  "person_with_possible_knife",
  "fire_or_smoke_hazard",
  "aggressive_body_language",
  "distress_facial_expression",
  "audio_threat_signal",
  "theft_or_shoplifting",
  "face_obscured",
  "evasion",
  "impersonation",
  "verbal_threats",
  "concealment"
];

function emptyVoteCountMap(defaultValue = 0): VoteCountMap {
  return {
    person_vaping: defaultValue,
    person_with_possible_knife: defaultValue,
    fire_or_smoke_hazard: defaultValue,
    aggressive_body_language: defaultValue,
    distress_facial_expression: defaultValue,
    audio_threat_signal: defaultValue,
    theft_or_shoplifting: defaultValue,
    face_obscured: defaultValue,
    evasion: defaultValue,
    impersonation: defaultValue,
    verbal_threats: defaultValue,
    concealment: defaultValue
  };
}

function emptyVoteBoolMap(defaultValue = false): VoteBoolMap {
  return {
    person_vaping: defaultValue,
    person_with_possible_knife: defaultValue,
    fire_or_smoke_hazard: defaultValue,
    aggressive_body_language: defaultValue,
    distress_facial_expression: defaultValue,
    audio_threat_signal: defaultValue,
    theft_or_shoplifting: defaultValue,
    face_obscured: defaultValue,
    evasion: defaultValue,
    impersonation: defaultValue,
    verbal_threats: defaultValue,
    concealment: defaultValue
  };
}

interface FrameMetrics {
  brightness: number;
  motion: number;
  edgeDensity: number;
  contrast: number;
  flicker: number;
  haze: number;
  fireLike: number;
  audioRms: number;
  audioPeak: number;
  audioSpike: number;
}

interface AnalysisResult {
  analysisSource: "openai" | "openrouter" | "groq" | "local_heuristic";
  analysisModel: string;
  modelReasoning: string[];
  modelStatus: "model_active" | "fallback_local";
  modelError: string | null;
  summary: string;
  confidence: number;
  tags: string[];
  threatScore: number;
  threatRating: number;
  threatLevel: "low" | "elevated" | "high" | "critical";
  shouldAlert: boolean;
  alertReason: string;
  vapeSuspected: boolean;
  vapeConfidence: number;
  knifeSuspected: boolean;
  knifeConfidence: number;
  detectedBehaviors: Array<{
    label: BehaviorLabel;
    confidence: number;
    evidence: string[];
  }>;
  likelyThreats: string[];
  thinking: {
    inputs: FrameMetrics;
    thresholds: Record<string, number>;
    contributions: Record<string, number>;
    rulesFired: string[];
    rulesNotFired: string[];
    escalationPath: string;
    temporal: {
      windowSize: number;
      requiredVotes: VoteCountMap;
      votes: VoteCountMap;
      latched: VoteBoolMap;
      smoothing: {
        rawThreatRating: number;
        smoothedThreatRating: number;
      };
      finalDetections: BehaviorLabel[];
    };
  };
}

interface VisionFrame {
  frameId: string;
  imageDataUrl: string;
  capturedAt: string;
  receivedAt: string;
  metrics: FrameMetrics;
  analysis: AnalysisResult;
}

interface VisionSignal {
  capturedAt: string;
  candidates: VoteBoolMap;
  threatRating: number;
}

interface VisionSession {
  latestFrame: VisionFrame;
  metricHistory: Array<{ capturedAt: string; metrics: FrameMetrics }>;
  signalHistory: VisionSignal[];
  latches: Record<BehaviorLabel, number>;
}

interface VisionFeedback {
  id: string;
  sessionId: string;
  frameId?: string;
  feedbackType: "false_alarm" | "missed_threat";
  expectedBehavior?: BehaviorLabel | "other";
  notes?: string;
  createdAt: string;
}

interface RuntimeModelConfig {
  provider: "openai" | "openrouter" | "groq";
  apiKey: string;
  model?: string;
}

interface ModelAttemptResult {
  attempted: boolean;
  source?: "openai" | "openrouter" | "groq";
  model?: string;
  decision?: OpenAiFrameDecision;
  error?: string;
}

const sessions = new Map<string, VisionSession>();
const feedbackLog: VisionFeedback[] = [];
const SESSION_ID_LENGTH = 6;

const createSessionSchema = z.object({
  sessionId: z
    .string()
    .trim()
    .min(4)
    .max(20)
    .regex(/^[a-zA-Z0-9_-]+$/)
    .optional()
});

const uploadFrameSchema = z.object({
  sessionId: z.string().min(4).max(20),
  imageDataUrl: z.string().startsWith("data:image/"),
  capturedAt: z.string().datetime(),
  metrics: z.object({
    brightness: z.number().min(0).max(1),
    motion: z.number().min(0).max(1),
    edgeDensity: z.number().min(0).max(1),
    contrast: z.number().min(0).max(1),
    flicker: z.number().min(0).max(1),
    haze: z.number().min(0).max(1),
    fireLike: z.number().min(0).max(1),
    audioRms: z.number().min(0).max(1),
    audioPeak: z.number().min(0).max(1),
    audioSpike: z.number().min(0).max(1)
  }),
  runtime: z
    .object({
      provider: z.enum(["openai", "openrouter", "groq"]),
      apiKey: z.string().min(12).max(300),
      model: z.string().min(3).max(120).optional()
    })
    .optional()
});

const feedbackSchema = z.object({
  sessionId: z.string().min(4).max(20),
  frameId: z.string().min(4).max(80).optional(),
  feedbackType: z.enum(["false_alarm", "missed_threat"]),
  expectedBehavior: z
    .enum([
      "person_vaping",
      "person_with_possible_knife",
      "fire_or_smoke_hazard",
      "aggressive_body_language",
      "distress_facial_expression",
      "audio_threat_signal",
      "theft_or_shoplifting",
      "face_obscured",
      "evasion",
      "impersonation",
      "verbal_threats",
      "concealment",
      "other"
    ])
    .optional(),
  notes: z.string().max(400).optional()
});

const openAiFrameDecisionSchema = z.object({
  summary: z.string().min(4).max(260),
  threat_rating: z.number().int().min(0).max(100),
  should_alert: z.boolean(),
  alert_reason: z.string().min(4).max(260),
  person_vaping_confidence: z.number().min(0).max(1),
  person_with_possible_knife_confidence: z.number().min(0).max(1),
  fire_or_smoke_hazard_confidence: z.number().min(0).max(1),
  aggressive_body_language_confidence: z.number().min(0).max(1),
  distress_facial_expression_confidence: z.number().min(0).max(1),
  audio_threat_signal_confidence: z.number().min(0).max(1),
  theft_or_shoplifting_confidence: z.number().min(0).max(1),
  face_obscured_confidence: z.number().min(0).max(1),
  evasion_confidence: z.number().min(0).max(1),
  impersonation_confidence: z.number().min(0).max(1),
  verbal_threats_confidence: z.number().min(0).max(1),
  concealment_confidence: z.number().min(0).max(1),
  likely_threats: z.array(z.string().min(2).max(80)).max(12).default([]),
  reasoning: z.array(z.string().min(2).max(220)).max(12).default([])
});

type OpenAiFrameDecision = z.infer<typeof openAiFrameDecisionSchema>;

function randomSessionId(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "";
  for (let i = 0; i < SESSION_ID_LENGTH; i += 1) {
    id += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return id;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function clampThreat(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function averageHaze(history: FrameMetrics[]): number {
  if (history.length === 0) {
    return 0;
  }
  const sum = history.reduce((acc, frame) => acc + frame.haze, 0);
  return sum / history.length;
}

function deriveThreatLevel(threatRating: number): AnalysisResult["threatLevel"] {
  if (threatRating >= 80) {
    return "critical";
  }
  if (threatRating >= 60) {
    return "high";
  }
  if (threatRating >= 35) {
    return "elevated";
  }
  return "low";
}

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
  return ranking[label];
}

function behaviorAlertMessage(label: BehaviorLabel): string {
  const messages: Record<BehaviorLabel, string> = {
    person_vaping: "Confirmed temporal vaping behavior.",
    person_with_possible_knife: "Confirmed temporal signal for possible knife.",
    fire_or_smoke_hazard: "Confirmed fire or smoke hazard in scene.",
    aggressive_body_language: "Confirmed aggressive body language pattern.",
    distress_facial_expression: "Confirmed distress/fear expression pattern.",
    audio_threat_signal: "Confirmed threatening audio signal pattern.",
    theft_or_shoplifting: "Confirmed theft or shoplifting behavior.",
    face_obscured: "Confirmed face obscuring or mask detection.",
    evasion: "Confirmed evasion or suspicious loitering behavior.",
    impersonation: "Confirmed official impersonation behavior.",
    verbal_threats: "Confirmed verbal threat or warning signs.",
    concealment: "Confirmed suspicious concealment behavior."
  };
  return messages[label];
}

function buildVisionSystemPrompt(): string {
  return [
    "You analyze one live safety camera frame.",
    "Focus on visible evidence only.",
    "No hallucinations.",
    "Use conservative confidence when uncertain.",
    "Behaviors to detect: person_vaping, person_with_possible_knife, fire_or_smoke_hazard, aggressive_body_language, distress_facial_expression, audio_threat_signal, theft_or_shoplifting, face_obscured, evasion, impersonation, verbal_threats, concealment.",
    "Behavior definitions:",
    "- evasion: Loitering in areas with no logical reason, changing direction/pacing upon seeing security/staff, attempting to avoid eye contact, avoiding interaction, or acting highly nervous/fidgety.",
    "- impersonation: Pretending to be an official (police officer, utility worker, or delivery driver) to gain unwarranted access to restricted spaces or private property.",
    "- verbal_threats: Explicitly expressing spoken or written intent to harm individuals, damage infrastructure, or disrupt secured sites.",
    "- concealment: Slipping items into pockets/bags/sleeves, wearing heavy/bulky coats or out-of-season layers, carrying oversized backpacks/shopping totes, or hiding items inside stroller/cart/other props.",
    "- theft_or_shoplifting: Shoplifting, pocketing items, taking/tampering with price/security tags, in-store consumption/eating without paying, or carrying goods past checkouts/blind spots.",
    "- face_obscured: Wearing masks, balaclavas, hoodies pulled tight, or helmets obscuring the face to hide identity.",
    "audio_threat_signal should use only provided audio metrics context from user text."
  ].join(" ");
}

function buildVisionUserPrompt(metrics: FrameMetrics): string {
  return [
    "Return JSON with fields summary, threat_rating(0-100), should_alert, alert_reason,",
    "person_vaping_confidence, person_with_possible_knife_confidence, fire_or_smoke_hazard_confidence,",
    "aggressive_body_language_confidence, distress_facial_expression_confidence, audio_threat_signal_confidence,",
    "theft_or_shoplifting_confidence, face_obscured_confidence, evasion_confidence, impersonation_confidence, verbal_threats_confidence, concealment_confidence,",
    "likely_threats(string[]), reasoning(string[]).",
    `Audio metrics (0-1): rms=${metrics.audioRms.toFixed(3)}, peak=${metrics.audioPeak.toFixed(3)}, spike=${metrics.audioSpike.toFixed(3)}.`,
    `Visual metrics (0-1): haze=${metrics.haze.toFixed(3)}, fireLike=${metrics.fireLike.toFixed(3)}, motion=${metrics.motion.toFixed(3)}, contrast=${metrics.contrast.toFixed(3)}.`
  ].join(" ");
}

function extractJsonObject(text: string): string | null {
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first < 0 || last < 0 || last <= first) {
    return null;
  }
  return text.slice(first, last + 1);
}

function parseOpenAiLikeText(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const asRecord = payload as Record<string, unknown>;

  if (typeof asRecord.output_text === "string") {
    return asRecord.output_text;
  }

  if (Array.isArray(asRecord.choices) && asRecord.choices.length > 0) {
    const choice = asRecord.choices[0] as Record<string, unknown>;
    const message = (choice.message ?? {}) as Record<string, unknown>;

    if (typeof message.content === "string") {
      return message.content;
    }

    if (Array.isArray(message.content)) {
      const joined = message.content
        .map((item) => {
          if (!item || typeof item !== "object") {
            return "";
          }
          const part = item as Record<string, unknown>;
          if (typeof part.text === "string") {
            return part.text;
          }
          return "";
        })
        .join("\n")
        .trim();
      return joined.length > 0 ? joined : null;
    }
  }

  return null;
}

async function analyzeWithOpenAI(
  config: RuntimeModelConfig,
  imageDataUrl: string,
  metrics: FrameMetrics
): Promise<{ decision: OpenAiFrameDecision | null; error?: string }> {
  const model = config.model?.trim() || "gpt-4.1-mini";
  const requestBody = {
    model,
    input: [
      {
        role: "system",
        content: [{ type: "input_text", text: buildVisionSystemPrompt() }]
      },
      {
        role: "user",
        content: [
          { type: "input_text", text: buildVisionUserPrompt(metrics) },
          { type: "input_image", image_url: imageDataUrl }
        ]
      }
    ],
    text: {
      format: {
        type: "json_schema",
        name: "vision_frame_decision",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            summary: { type: "string" },
            threat_rating: { type: "integer", minimum: 0, maximum: 100 },
            should_alert: { type: "boolean" },
            alert_reason: { type: "string" },
            person_vaping_confidence: { type: "number", minimum: 0, maximum: 1 },
            person_with_possible_knife_confidence: { type: "number", minimum: 0, maximum: 1 },
            fire_or_smoke_hazard_confidence: { type: "number", minimum: 0, maximum: 1 },
            aggressive_body_language_confidence: { type: "number", minimum: 0, maximum: 1 },
            distress_facial_expression_confidence: { type: "number", minimum: 0, maximum: 1 },
            audio_threat_signal_confidence: { type: "number", minimum: 0, maximum: 1 },
            theft_or_shoplifting_confidence: { type: "number", minimum: 0, maximum: 1 },
            face_obscured_confidence: { type: "number", minimum: 0, maximum: 1 },
            evasion_confidence: { type: "number", minimum: 0, maximum: 1 },
            impersonation_confidence: { type: "number", minimum: 0, maximum: 1 },
            verbal_threats_confidence: { type: "number", minimum: 0, maximum: 1 },
            concealment_confidence: { type: "number", minimum: 0, maximum: 1 },
            likely_threats: {
              type: "array",
              items: { type: "string" },
              maxItems: 12
            },
            reasoning: {
              type: "array",
              items: { type: "string" },
              maxItems: 12
            }
          },
          required: [
            "summary",
            "threat_rating",
            "should_alert",
            "alert_reason",
            "person_vaping_confidence",
            "person_with_possible_knife_confidence",
            "fire_or_smoke_hazard_confidence",
            "aggressive_body_language_confidence",
            "distress_facial_expression_confidence",
            "audio_threat_signal_confidence",
            "theft_or_shoplifting_confidence",
            "face_obscured_confidence",
            "evasion_confidence",
            "impersonation_confidence",
            "verbal_threats_confidence",
            "concealment_confidence",
            "likely_threats",
            "reasoning"
          ]
        }
      }
    },
    max_output_tokens: 350
  };

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error("OpenAI Responses API Error status:", response.status, "body:", errBody);
      return { decision: null, error: `openai_http_${response.status}` };
    }

    const payload = (await response.json()) as unknown;
    const content = parseOpenAiLikeText(payload);
    if (!content) {
      return { decision: null, error: "openai_empty_content" };
    }

    const jsonSlice = extractJsonObject(content);
    if (!jsonSlice) {
      return { decision: null, error: "openai_no_json" };
    }

    const parsed = JSON.parse(jsonSlice) as unknown;
    return { decision: openAiFrameDecisionSchema.parse(parsed) };
  } catch (error) {
    return {
      decision: null,
      error: error instanceof Error ? error.message : "openai_request_failed"
    };
  }
}

async function analyzeWithOpenRouter(
  config: RuntimeModelConfig,
  imageDataUrl: string,
  metrics: FrameMetrics
): Promise<{ decision: OpenAiFrameDecision | null; error?: string }> {
  const model = config.model?.trim() || "openai/gpt-4o-mini";
  const requestBody = {
    model,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: buildVisionSystemPrompt() },
      {
        role: "user",
        content: [
          { type: "text", text: buildVisionUserPrompt(metrics) },
          { type: "image_url", image_url: { url: imageDataUrl } }
        ]
      }
    ]
  };

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://sentinel.local",
        "X-Title": "Sentinel Vision"
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      return { decision: null, error: `openrouter_http_${response.status}` };
    }

    const payload = (await response.json()) as unknown;
    const content = parseOpenAiLikeText(payload);
    if (!content) {
      return { decision: null, error: "openrouter_empty_content" };
    }

    const jsonSlice = extractJsonObject(content);
    if (!jsonSlice) {
      return { decision: null, error: "openrouter_no_json" };
    }

    const parsed = JSON.parse(jsonSlice) as unknown;
    return { decision: openAiFrameDecisionSchema.parse(parsed) };
  } catch (error) {
    return {
      decision: null,
      error: error instanceof Error ? error.message : "openrouter_request_failed"
    };
  }
}

async function analyzeWithGroq(
  config: RuntimeModelConfig,
  imageDataUrl: string,
  metrics: FrameMetrics
): Promise<{ decision: OpenAiFrameDecision | null; error?: string }> {
  const model = config.model?.trim() || "meta-llama/llama-4-scout-17b-16e-instruct";
  const requestBody = {
    model,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: buildVisionSystemPrompt() },
      {
        role: "user",
        content: [
          { type: "text", text: buildVisionUserPrompt(metrics) },
          { type: "image_url", image_url: { url: imageDataUrl } }
        ]
      }
    ]
  };

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errText = await response.text();
      return { decision: null, error: `groq_http_${response.status}: ${errText}` };
    }

    const payload = (await response.json()) as unknown;
    const content = parseOpenAiLikeText(payload);
    if (!content) {
      return { decision: null, error: "groq_empty_content" };
    }

    const jsonSlice = extractJsonObject(content);
    if (!jsonSlice) {
      return { decision: null, error: "groq_no_json" };
    }

    const parsed = JSON.parse(jsonSlice) as unknown;
    return { decision: openAiFrameDecisionSchema.parse(parsed) };
  } catch (error) {
    return {
      decision: null,
      error: error instanceof Error ? error.message : "groq_request_failed"
    };
  }
}

async function analyzeWithModel(
  runtime: RuntimeModelConfig | undefined,
  imageDataUrl: string,
  metrics: FrameMetrics
): Promise<ModelAttemptResult> {
  const fromDashboard = runtime?.apiKey?.trim()
    ? {
        provider: runtime.provider,
        apiKey: runtime.apiKey.trim(),
        model: runtime.model?.trim()
      }
    : null;

  const fromEnvGroq = process.env.GROQ_API_KEY?.trim()
    ? {
        provider: "groq" as const,
        apiKey: process.env.GROQ_API_KEY.trim(),
        model: process.env.GROQ_VISION_MODEL?.trim() || "meta-llama/llama-4-scout-17b-16e-instruct"
      }
    : null;

  const fromEnvOpenRouter = process.env.OPENROUTER_API_KEY?.trim()
    ? {
        provider: "openrouter" as const,
        apiKey: process.env.OPENROUTER_API_KEY.trim(),
        model: process.env.OPENROUTER_VISION_MODEL?.trim() || "openai/gpt-4o-mini"
      }
    : null;

  const fromEnvOpenAi = process.env.OPENAI_API_KEY?.trim()
    ? {
        provider: "openai" as const,
        apiKey: process.env.OPENAI_API_KEY.trim(),
        model: process.env.OPENAI_VISION_MODEL?.trim() || "gpt-4o-mini"
      }
    : null;

  const config = fromDashboard ?? fromEnvGroq ?? fromEnvOpenRouter ?? fromEnvOpenAi;
  if (!config) {
    return { attempted: false };
  }

  if (config.provider === "groq") {
    const attempt = await analyzeWithGroq(config, imageDataUrl, metrics);
    if (!attempt.decision) {
      return {
        attempted: true,
        source: "groq",
        model: config.model?.trim() || "meta-llama/llama-4-scout-17b-16e-instruct",
        error: attempt.error ?? "groq_no_decision"
      };
    }

    return {
      attempted: true,
      source: "groq",
      model: config.model?.trim() || "meta-llama/llama-4-scout-17b-16e-instruct",
      decision: attempt.decision
    };
  }

  if (config.provider === "openrouter") {
    const attempt = await analyzeWithOpenRouter(config, imageDataUrl, metrics);
    if (!attempt.decision) {
      return {
        attempted: true,
        source: "openrouter",
        model: config.model?.trim() || "openai/gpt-4o-mini",
        error: attempt.error ?? "openrouter_no_decision"
      };
    }

    return {
      attempted: true,
      source: "openrouter",
      model: config.model?.trim() || "openai/gpt-4o-mini",
      decision: attempt.decision
    };
  }

  const attempt = await analyzeWithOpenAI(config, imageDataUrl, metrics);
  if (!attempt.decision) {
    return {
      attempted: true,
      source: "openai",
      model: config.model?.trim() || "gpt-4.1-mini",
      error: attempt.error ?? "openai_no_decision"
    };
  }

  return {
    attempted: true,
    source: "openai",
    model: config.model?.trim() || "gpt-4.1-mini",
    decision: attempt.decision
  };
}

function getBehaviorConfidenceMap(analysis: AnalysisResult): VoteCountMap {
  const map = emptyVoteCountMap(0);
  for (const detection of analysis.detectedBehaviors) {
    map[detection.label] = detection.confidence;
  }
  const contributions = analysis.thinking?.contributions ?? {};
  for (const label of behaviorLabels) {
    if (map[label] > 0) {
      continue;
    }
    const key = `behavior_${label}`;
    const value = contributions[key];
    if (typeof value === "number") {
      map[label] = clamp01(value);
    }
  }
  return map;
}

function detectionsFromConfidence(confidenceMap: VoteCountMap, thresholds: VoteCountMap): AnalysisResult["detectedBehaviors"] {
  const detections: AnalysisResult["detectedBehaviors"] = [];
  for (const label of behaviorLabels) {
    if (confidenceMap[label] >= thresholds[label]) {
      detections.push({
        label,
        confidence: Number(confidenceMap[label].toFixed(2)),
        evidence: ["confidence_threshold"]
      });
    }
  }
  return detections;
}

function isModelConfigured(runtime: RuntimeModelConfig | undefined): boolean {
  return !!(
    runtime?.apiKey?.trim() ||
    process.env.OPENROUTER_API_KEY?.trim() ||
    process.env.OPENAI_API_KEY?.trim()
  );
}

function mergeModelDecision(
  base: AnalysisResult,
  source: "openai" | "openrouter" | "groq",
  model: string,
  decision: OpenAiFrameDecision
): AnalysisResult {
  const modelConf: VoteCountMap = {
    person_vaping: clamp01(decision.person_vaping_confidence),
    person_with_possible_knife: clamp01(decision.person_with_possible_knife_confidence),
    fire_or_smoke_hazard: clamp01(decision.fire_or_smoke_hazard_confidence),
    aggressive_body_language: clamp01(decision.aggressive_body_language_confidence),
    distress_facial_expression: clamp01(decision.distress_facial_expression_confidence),
    audio_threat_signal: clamp01(decision.audio_threat_signal_confidence),
    theft_or_shoplifting: clamp01(decision.theft_or_shoplifting_confidence),
    face_obscured: clamp01(decision.face_obscured_confidence),
    evasion: clamp01(decision.evasion_confidence),
    impersonation: clamp01(decision.impersonation_confidence),
    verbal_threats: clamp01(decision.verbal_threats_confidence),
    concealment: clamp01(decision.concealment_confidence)
  };

  const fused: VoteCountMap = modelConf;

  const detectionThresholds: VoteCountMap = {
    person_vaping: 0.22,
    person_with_possible_knife: 0.46,
    fire_or_smoke_hazard: 0.36,
    aggressive_body_language: 0.46,
    distress_facial_expression: 0.46,
    audio_threat_signal: 0.44,
    theft_or_shoplifting: 0.40,
    face_obscured: 0.40,
    evasion: 0.40,
    impersonation: 0.40,
    verbal_threats: 0.40,
    concealment: 0.40
  };

  const detectedBehaviors = detectionsFromConfidence(fused, detectionThresholds).map((item) => ({
    ...item,
    evidence: ["model_decision", source]
  }));

  let threatRating = clampThreat(decision.threat_rating);
  if (fused.person_with_possible_knife >= detectionThresholds.person_with_possible_knife) {
    threatRating = Math.max(threatRating, 78);
  }
  if (fused.fire_or_smoke_hazard >= detectionThresholds.fire_or_smoke_hazard) {
    threatRating = Math.max(threatRating, 76);
  }
  if (fused.audio_threat_signal >= detectionThresholds.audio_threat_signal) {
    threatRating = Math.max(threatRating, 66);
  }
  if (fused.theft_or_shoplifting >= detectionThresholds.theft_or_shoplifting) {
    threatRating = Math.max(threatRating, 74);
  }
  if (fused.impersonation >= detectionThresholds.impersonation) {
    threatRating = Math.max(threatRating, 74);
  }
  if (fused.verbal_threats >= detectionThresholds.verbal_threats) {
    threatRating = Math.max(threatRating, 72);
  }
  if (fused.face_obscured >= detectionThresholds.face_obscured) {
    threatRating = Math.max(threatRating, 62);
  }
  if (fused.concealment >= detectionThresholds.concealment) {
    threatRating = Math.max(threatRating, 62);
  }
  if (fused.evasion >= detectionThresholds.evasion) {
    threatRating = Math.max(threatRating, 62);
  }

  const shouldAlert =
    decision.should_alert ||
    threatRating >= 38 ||
    detectedBehaviors.length > 0;

  return {
    ...base,
    analysisSource: source,
    analysisModel: model,
    modelReasoning: decision.reasoning.length > 0 ? decision.reasoning : base.modelReasoning,
    modelStatus: "model_active",
    modelError: null,
    summary: decision.summary || base.summary,
    threatRating,
    threatScore: Number((threatRating / 100).toFixed(2)),
    threatLevel: deriveThreatLevel(threatRating),
    shouldAlert,
    alertReason: decision.alert_reason || base.alertReason,
    vapeSuspected: fused.person_vaping >= detectionThresholds.person_vaping,
    vapeConfidence: fused.person_vaping,
    knifeSuspected: fused.person_with_possible_knife >= detectionThresholds.person_with_possible_knife,
    knifeConfidence: fused.person_with_possible_knife,
    detectedBehaviors,
    likelyThreats: [...new Set(decision.likely_threats)],
    tags: [...new Set([...base.tags, source === "openrouter" ? "openrouter_model" : "openai_model"])],
    thinking: {
      ...base.thinking,
      rulesFired: [`${source}_model_fusion`],
      escalationPath: decision.reasoning.length > 0 ? decision.reasoning.join(" | ") : `${source} model analysis.`
    }
  };
}

function buildLocalAnalysis(
  metrics: FrameMetrics,
  history: FrameMetrics[],
  modelConfigured = false
): AnalysisResult {
  const tags: string[] = [];
  const likelyThreats: string[] = [];
  const rulesFired: string[] = [];
  const rulesNotFired: string[] = [];

  const thresholds: {
    lowLight: number;
    highMotion: number;
    crowdedScene: number;
    highContrast: number;
    flickerSpike: number;
    hazeDense: number;
    hazeSpike: number;
    fireVisible: number;
    fireSpike: number;
    audioRms: number;
    audioPeak: number;
    audioSpike: number;
    vapeDetect: number;
    knifeDetect: number;
    fireDetect: number;
    aggressiveDetect: number;
    distressDetect: number;
    audioThreatDetect: number;
  } = {
    lowLight: 0.35,
    highMotion: 0.14,
    crowdedScene: 0.14,
    highContrast: 0.42,
    flickerSpike: 0.12,
    hazeDense: 0.2,
    hazeSpike: 0.05,
    fireVisible: 0.12,
    fireSpike: 0.07,
    audioRms: 0.18,
    audioPeak: 0.45,
    audioSpike: 0.2,
    vapeDetect: 0.22,
    knifeDetect: 0.48,
    fireDetect: 0.38,
    aggressiveDetect: 0.45,
    distressDetect: 0.44,
    audioThreatDetect: 0.44
  };

  const prev = history.length > 0 ? history[history.length - 1] : undefined;
  const avgHaze = averageHaze(history);
  const hazeIncrease = Math.max(0, metrics.haze - (history.length > 0 ? avgHaze : metrics.haze));
  const fireIncrease = Math.max(0, metrics.fireLike - (prev?.fireLike ?? metrics.fireLike));

  if (metrics.brightness < thresholds.lowLight) {
    tags.push("low_light");
    likelyThreats.push("visibility_loss");
    rulesFired.push("low_light");
  } else {
    tags.push("well_lit");
    rulesNotFired.push("low_light");
  }

  if (metrics.motion > thresholds.highMotion) {
    tags.push("high_motion");
    likelyThreats.push("rapid_movement");
    rulesFired.push("high_motion");
  } else {
    rulesNotFired.push("high_motion");
  }

  if (metrics.edgeDensity > thresholds.crowdedScene) {
    tags.push("crowded_scene");
    rulesFired.push("crowded_scene");
  } else {
    rulesNotFired.push("crowded_scene");
  }

  if (metrics.contrast > thresholds.highContrast) {
    tags.push("high_contrast");
    rulesFired.push("high_contrast");
  } else {
    rulesNotFired.push("high_contrast");
  }

  if (metrics.flicker > thresholds.flickerSpike) {
    tags.push("flicker_spike");
    rulesFired.push("flicker_spike");
  } else {
    rulesNotFired.push("flicker_spike");
  }

  if (metrics.haze > thresholds.hazeDense) {
    tags.push("haze_dense");
    likelyThreats.push("air_aerosol_presence");
    rulesFired.push("haze_dense");
  } else {
    rulesNotFired.push("haze_dense");
  }

  if (hazeIncrease > thresholds.hazeSpike) {
    tags.push("haze_rising");
    rulesFired.push("haze_rising");
  } else {
    rulesNotFired.push("haze_rising");
  }

  if (metrics.fireLike > thresholds.fireVisible) {
    tags.push("fire_visible");
    likelyThreats.push("possible_fire_or_heat_source");
    rulesFired.push("fire_visible");
  } else {
    rulesNotFired.push("fire_visible");
  }

  if (fireIncrease > thresholds.fireSpike) {
    tags.push("fire_rising");
    rulesFired.push("fire_rising");
  } else {
    rulesNotFired.push("fire_rising");
  }

  if (metrics.audioPeak > thresholds.audioPeak || metrics.audioSpike > thresholds.audioSpike) {
    tags.push("audio_alarm");
    likelyThreats.push("possible_shout_or_impact");
    rulesFired.push("audio_alarm");
  } else {
    rulesNotFired.push("audio_alarm");
  }

  const vapeConfidence = modelConfigured
    ? 0
    : Number(
        clamp01(
          metrics.haze * 0.58 +
            hazeIncrease * 1.1 +
            metrics.flicker * 0.15 +
            (metrics.motion >= 0.04 && metrics.motion <= 0.65 ? 0.05 : 0) +
            (metrics.contrast < 0.74 ? 0.03 : 0) -
            metrics.fireLike * 0.3
        ).toFixed(2)
      );

  const knifeConfidence = modelConfigured
    ? 0
    : Number(
        clamp01(
          metrics.edgeDensity * 0.35 +
            metrics.contrast * 0.35 +
            (metrics.edgeDensity > 0.28 ? 0.2 : 0) +
            (metrics.contrast > 0.72 ? 0.2 : 0) +
            (metrics.motion >= 0.03 && metrics.motion <= 0.35 ? 0.03 : 0)
        ).toFixed(2)
      );

  const fireConfidence = modelConfigured
    ? 0
    : Number(
        clamp01(metrics.fireLike * 0.68 + fireIncrease * 1.2 + (tags.includes("flicker_spike") ? 0.08 : 0)).toFixed(2)
      );

  const aggressiveConfidence = modelConfigured
    ? 0
    : Number(
        clamp01(metrics.motion * 0.45 + metrics.edgeDensity * 0.25 + metrics.audioSpike * 0.28 + (tags.includes("audio_alarm") ? 0.08 : 0)).toFixed(2)
      );

  const distressConfidence = modelConfigured
    ? 0
    : Number(
        clamp01(metrics.audioRms * 0.25 + metrics.audioPeak * 0.35 + metrics.audioSpike * 0.35 + (metrics.flicker > 0.16 ? 0.08 : 0)).toFixed(2)
      );

  const audioThreatConfidence = modelConfigured
    ? 0
    : Number(
        clamp01(metrics.audioPeak * 0.5 + metrics.audioSpike * 0.6 + metrics.audioRms * 0.2).toFixed(2)
      );

  const confidenceMap: VoteCountMap = {
    person_vaping: vapeConfidence,
    person_with_possible_knife: knifeConfidence,
    fire_or_smoke_hazard: fireConfidence,
    aggressive_body_language: aggressiveConfidence,
    distress_facial_expression: distressConfidence,
    audio_threat_signal: audioThreatConfidence,
    theft_or_shoplifting: modelConfigured ? 0 : Number(clamp01(metrics.motion * 0.2 + metrics.edgeDensity * 0.1).toFixed(2)),
    face_obscured: modelConfigured ? 0 : (metrics.brightness < 0.25 ? 0.3 : 0),
    evasion: modelConfigured ? 0 : Number(clamp01(metrics.motion * 0.15 + metrics.edgeDensity * 0.1).toFixed(2)),
    impersonation: 0,
    verbal_threats: modelConfigured ? 0 : Number(clamp01(metrics.audioPeak * 0.3).toFixed(2)),
    concealment: modelConfigured ? 0 : Number(clamp01(metrics.edgeDensity * 0.2).toFixed(2))
  };

  const detectionThresholds: VoteCountMap = {
    person_vaping: thresholds.vapeDetect,
    person_with_possible_knife: thresholds.knifeDetect,
    fire_or_smoke_hazard: thresholds.fireDetect,
    aggressive_body_language: thresholds.aggressiveDetect,
    distress_facial_expression: thresholds.distressDetect,
    audio_threat_signal: thresholds.audioThreatDetect,
    theft_or_shoplifting: 0.40,
    face_obscured: 0.40,
    evasion: 0.40,
    impersonation: 0.40,
    verbal_threats: 0.40,
    concealment: 0.40
  };

  const detectedBehaviors = detectionsFromConfidence(confidenceMap, detectionThresholds);

  if (detectedBehaviors.some((item) => item.label === "person_vaping")) {
    likelyThreats.push("possible_vape_aerosol");
  }
  if (detectedBehaviors.some((item) => item.label === "person_with_possible_knife")) {
    likelyThreats.push("possible_bladed_weapon");
  }
  if (detectedBehaviors.some((item) => item.label === "fire_or_smoke_hazard")) {
    likelyThreats.push("fire_or_smoke_hazard");
  }
  if (detectedBehaviors.some((item) => item.label === "audio_threat_signal")) {
    likelyThreats.push("audio_threat_signal");
  }
  if (detectedBehaviors.some((item) => item.label === "theft_or_shoplifting")) {
    likelyThreats.push("theft_or_shoplifting");
  }
  if (detectedBehaviors.some((item) => item.label === "face_obscured")) {
    likelyThreats.push("face_obscured");
  }
  if (detectedBehaviors.some((item) => item.label === "evasion")) {
    likelyThreats.push("evasion");
  }
  if (detectedBehaviors.some((item) => item.label === "impersonation")) {
    likelyThreats.push("impersonation");
  }
  if (detectedBehaviors.some((item) => item.label === "verbal_threats")) {
    likelyThreats.push("verbal_threats");
  }
  if (detectedBehaviors.some((item) => item.label === "concealment")) {
    likelyThreats.push("concealment");
  }

  const contributions: Record<string, number> = {
    motion: Number((metrics.motion * 0.22).toFixed(2)),
    density: Number((metrics.edgeDensity * 0.1).toFixed(2)),
    lightPenalty: Number((metrics.brightness < thresholds.lowLight ? (thresholds.lowLight - metrics.brightness) * 0.35 : 0).toFixed(2)),
    contrast: Number((metrics.contrast * 0.1).toFixed(2)),
    flicker: Number((metrics.flicker * 0.08).toFixed(2)),
    haze: Number((metrics.haze * 0.14).toFixed(2)),
    hazeIncrease: Number((hazeIncrease * 0.22).toFixed(2)),
    fire: Number((fireConfidence * 0.22).toFixed(2)),
    audio: Number((audioThreatConfidence * 0.2).toFixed(2)),
    aggression: Number((aggressiveConfidence * 0.12).toFixed(2)),
    distress: Number((distressConfidence * 0.1).toFixed(2)),
    behavior_person_vaping: vapeConfidence,
    behavior_person_with_possible_knife: knifeConfidence,
    behavior_fire_or_smoke_hazard: fireConfidence,
    behavior_aggressive_body_language: aggressiveConfidence,
    behavior_distress_facial_expression: distressConfidence,
    behavior_audio_threat_signal: audioThreatConfidence,
    behavior_theft_or_shoplifting: confidenceMap.theft_or_shoplifting,
    behavior_face_obscured: confidenceMap.face_obscured,
    behavior_evasion: confidenceMap.evasion,
    behavior_impersonation: confidenceMap.impersonation,
    behavior_verbal_threats: confidenceMap.verbal_threats,
    behavior_concealment: confidenceMap.concealment
  };

  const rawScore = modelConfigured
    ? 0
    : Object.entries(contributions)
        .filter(([key]) => !key.startsWith("behavior_"))
        .reduce((acc, [, value]) => acc + value, 0);
  const threatScore = Number(clamp01(rawScore).toFixed(2));
  const threatRating = clampThreat(threatScore * 100);
  const threatLevel = deriveThreatLevel(threatRating);
  const shouldAlert = !modelConfigured && (threatRating >= 40 || detectedBehaviors.length > 0);

  let summary = modelConfigured ? "Monitoring scene..." : "Scene appears stable.";
  if (detectedBehaviors.length > 0) {
    const labels = detectedBehaviors.map((item) => item.label).join(", ");
    summary = `Potential threats detected: ${labels}.`;
  } else if (!modelConfigured && (metrics.audioSpike > 0.1 || metrics.fireLike > 0.08)) {
    summary = "Early risk signals detected; monitoring for persistence.";
  }

  let alertReason = "No immediate threat pattern.";
  if (detectedBehaviors.length > 0) {
    const top = [...detectedBehaviors].sort((a, b) => behaviorPriority(b.label) - behaviorPriority(a.label))[0];
    if (top) {
      alertReason = behaviorAlertMessage(top.label);
    }
  } else if (shouldAlert) {
    alertReason = "Elevated risk score from combined visual/audio cues.";
  }

  const confidence = Number(
    clamp01(0.45 + metrics.motion * 0.14 + metrics.edgeDensity * 0.12 + metrics.fireLike * 0.1 + metrics.audioPeak * 0.08).toFixed(2)
  );

  return {
    analysisSource: "local_heuristic",
    analysisModel: "rules-v4",
    modelReasoning: [],
    modelStatus: "fallback_local",
    modelError: null,
    summary,
    confidence,
    tags: [...new Set(tags)],
    threatScore,
    threatRating,
    threatLevel,
    shouldAlert,
    alertReason,
    vapeSuspected: detectedBehaviors.some((item) => item.label === "person_vaping"),
    vapeConfidence,
    knifeSuspected: detectedBehaviors.some((item) => item.label === "person_with_possible_knife"),
    knifeConfidence,
    detectedBehaviors,
    likelyThreats: [...new Set(likelyThreats)],
    thinking: {
      inputs: metrics,
      thresholds,
      contributions,
      rulesFired,
      rulesNotFired,
      escalationPath: shouldAlert ? "Local multi-signal threshold crossed." : "No threshold crossed.",
      temporal: {
        windowSize: 0,
        requiredVotes: emptyVoteCountMap(0),
        votes: emptyVoteCountMap(0),
        latched: emptyVoteBoolMap(false),
        smoothing: {
          rawThreatRating: threatRating,
          smoothedThreatRating: threatRating
        },
        finalDetections: detectedBehaviors.map((item) => item.label)
      }
    }
  };
}

function applyTemporalDecisions(
  analysis: AnalysisResult,
  signalHistory: VisionSignal[],
  previousLatches: Record<BehaviorLabel, number> | undefined,
  nowMs: number
): { analysis: AnalysisResult; nextLatches: Record<BehaviorLabel, number>; rawSignal: VisionSignal } {
  const windowSize = 3;
  const threatWindow = 3;

  const requiredVotes: VoteCountMap = {
    person_vaping: 1,
    person_with_possible_knife: 1,
    fire_or_smoke_hazard: 1,
    aggressive_body_language: 1,
    distress_facial_expression: 1,
    audio_threat_signal: 1,
    theft_or_shoplifting: 1,
    face_obscured: 1,
    evasion: 1,
    impersonation: 1,
    verbal_threats: 1,
    concealment: 1
  };

  const latchMs: Record<BehaviorLabel, number> = {
    person_vaping: 5_000,
    person_with_possible_knife: 6_000,
    fire_or_smoke_hazard: 6_000,
    aggressive_body_language: 5_000,
    distress_facial_expression: 5_000,
    audio_threat_signal: 6_000,
    theft_or_shoplifting: 6_000,
    face_obscured: 5_000,
    evasion: 5_000,
    impersonation: 6_000,
    verbal_threats: 6_000,
    concealment: 5_000
  };

  const baseConfidence = getBehaviorConfidenceMap(analysis);
  const instantDetections = new Set<BehaviorLabel>(analysis.detectedBehaviors.map((item) => item.label));
  const candidateThresholds: VoteCountMap = {
    person_vaping: Math.max(0.19, (analysis.thinking.thresholds.vapeDetect ?? 0.22) - 0.05),
    person_with_possible_knife: Math.max(0.22, (analysis.thinking.thresholds.knifeDetect ?? 0.48) - 0.04),
    fire_or_smoke_hazard: Math.max(0.2, (analysis.thinking.thresholds.fireDetect ?? 0.38) - 0.04),
    aggressive_body_language: Math.max(0.22, (analysis.thinking.thresholds.aggressiveDetect ?? 0.45) - 0.05),
    distress_facial_expression: Math.max(0.22, (analysis.thinking.thresholds.distressDetect ?? 0.44) - 0.05),
    audio_threat_signal: Math.max(0.22, (analysis.thinking.thresholds.audioThreatDetect ?? 0.44) - 0.04),
    theft_or_shoplifting: 0.36,
    face_obscured: 0.36,
    evasion: 0.36,
    impersonation: 0.36,
    verbal_threats: 0.36,
    concealment: 0.36
  };
  const strongInstantThresholds: VoteCountMap = {
    person_vaping: 0.5,
    person_with_possible_knife: 0.68,
    fire_or_smoke_hazard: 0.62,
    aggressive_body_language: 0.64,
    distress_facial_expression: 0.64,
    audio_threat_signal: 0.66,
    theft_or_shoplifting: 0.60,
    face_obscured: 0.60,
    evasion: 0.60,
    impersonation: 0.60,
    verbal_threats: 0.60,
    concealment: 0.60
  };
  const strongInstantDetections = new Set<BehaviorLabel>(
    behaviorLabels.filter((label) => instantDetections.has(label) && baseConfidence[label] >= strongInstantThresholds[label])
  );
  const currentCandidates = emptyVoteBoolMap(false);
  for (const label of behaviorLabels) {
    currentCandidates[label] = baseConfidence[label] >= candidateThresholds[label];
  }

  const recentSignals = signalHistory.slice(-(windowSize - 1));
  const votes = emptyVoteCountMap(0);
  for (const label of behaviorLabels) {
    const historicalVotes = recentSignals.reduce((acc, item) => acc + (item.candidates[label] ? 1 : 0), 0);
    votes[label] = requiredVotes[label] <= 1 ? (currentCandidates[label] ? 1 : 0) : historicalVotes + (currentCandidates[label] ? 1 : 0);
  }

  const nextLatches = { ...(previousLatches ?? ({} as Record<BehaviorLabel, number>)) };
  for (const label of behaviorLabels) {
    if (!Number.isFinite(nextLatches[label])) {
      nextLatches[label] = 0;
    }
    if (votes[label] >= requiredVotes[label]) {
      nextLatches[label] = nowMs + latchMs[label];
    }
  }

  const latched = emptyVoteBoolMap(false);
  const confirmed = emptyVoteBoolMap(false);
  for (const label of behaviorLabels) {
    confirmed[label] = votes[label] >= requiredVotes[label];
    latched[label] = nextLatches[label] > nowMs;
  }

  const finalDetections = behaviorLabels.filter(
    (label) => strongInstantDetections.has(label) || confirmed[label] || latched[label]
  );

  const rawThreatRating = analysis.threatRating;
  const smoothedThreatRating = Math.round(
    [...signalHistory.slice(-(threatWindow - 1)).map((item) => item.threatRating), rawThreatRating].reduce((acc, value) => acc + value, 0) /
      Math.max(1, Math.min(threatWindow, signalHistory.length + 1))
  );

  let finalThreatRating = smoothedThreatRating;
  if (finalDetections.includes("person_with_possible_knife")) {
    finalThreatRating = Math.max(finalThreatRating, 82);
  }
  if (finalDetections.includes("fire_or_smoke_hazard")) {
    finalThreatRating = Math.max(finalThreatRating, 80);
  }
  if (finalDetections.includes("audio_threat_signal")) {
    finalThreatRating = Math.max(finalThreatRating, 68);
  }
  if (finalDetections.includes("person_vaping")) {
    finalThreatRating = Math.max(finalThreatRating, 70);
  }
  if (finalDetections.includes("aggressive_body_language")) {
    finalThreatRating = Math.max(finalThreatRating, 64);
  }
  if (finalDetections.includes("distress_facial_expression")) {
    finalThreatRating = Math.max(finalThreatRating, 60);
  }
  if (finalDetections.includes("theft_or_shoplifting")) {
    finalThreatRating = Math.max(finalThreatRating, 78);
  }
  if (finalDetections.includes("impersonation")) {
    finalThreatRating = Math.max(finalThreatRating, 78);
  }
  if (finalDetections.includes("verbal_threats")) {
    finalThreatRating = Math.max(finalThreatRating, 76);
  }
  if (finalDetections.includes("face_obscured")) {
    finalThreatRating = Math.max(finalThreatRating, 66);
  }
  if (finalDetections.includes("concealment")) {
    finalThreatRating = Math.max(finalThreatRating, 66);
  }
  if (finalDetections.includes("evasion")) {
    finalThreatRating = Math.max(finalThreatRating, 64);
  }

  const finalThreatLevel = deriveThreatLevel(finalThreatRating);
  const shouldAlert = finalThreatRating >= 40 || finalDetections.length > 0;

  const finalConfidence = getBehaviorConfidenceMap(analysis);
  const finalBehaviors: AnalysisResult["detectedBehaviors"] = [];
  for (const label of finalDetections) {
    const voteConfidence = Number((votes[label] / windowSize).toFixed(2));
    const fromInstant = strongInstantDetections.has(label);
    finalBehaviors.push({
      label,
      confidence: Number(Math.max(finalConfidence[label], voteConfidence).toFixed(2)),
      evidence: fromInstant ? ["instant_signal", `votes_${votes[label]}_of_${windowSize}`] : ["temporal_vote", `votes_${votes[label]}_of_${windowSize}`]
    });
  }

  const finalLikelyThreats = [...analysis.likelyThreats];
  for (const label of finalDetections) {
    const mapping: Record<BehaviorLabel, string> = {
      person_vaping: "possible_vape_aerosol",
      person_with_possible_knife: "possible_bladed_weapon",
      fire_or_smoke_hazard: "fire_or_smoke_hazard",
      aggressive_body_language: "aggressive_body_language",
      distress_facial_expression: "distress_or_fear_expression",
      audio_threat_signal: "audio_threat_signal",
      theft_or_shoplifting: "theft_or_shoplifting",
      face_obscured: "face_obscured",
      evasion: "evasion",
      impersonation: "impersonation",
      verbal_threats: "verbal_threats",
      concealment: "concealment"
    };
    if (!finalLikelyThreats.includes(mapping[label])) {
      finalLikelyThreats.push(mapping[label]);
    }
  }

  const topBehavior = [...finalBehaviors]
    .sort((a, b) => {
      const aActive = Number(currentCandidates[a.label] || votes[a.label] > 0);
      const bActive = Number(currentCandidates[b.label] || votes[b.label] > 0);
      if (bActive !== aActive) {
        return bActive - aActive;
      }
      if (b.confidence !== a.confidence) {
        return b.confidence - a.confidence;
      }
      return behaviorPriority(b.label) - behaviorPriority(a.label);
    })
    .map((item) => item.label)[0];
  const alertReason = topBehavior
    ? behaviorAlertMessage(topBehavior)
    : shouldAlert
      ? analysis.alertReason
      : "No confirmed sustained threat pattern.";
  const summary =
    finalDetections.length > 0
      ? `Potential threats detected: ${finalDetections.join(", ")}.`
      : shouldAlert
        ? analysis.summary
        : analysis.threatRating >= 25
          ? "Early risk signals detected; awaiting confirmation."
          : "Scene appears stable.";

  const escalationPath =
    finalThreatLevel === "critical"
      ? "Temporal voting and smoothing escalated to critical."
      : finalThreatLevel === "high"
        ? "Temporal voting confirmed sustained high threat."
        : shouldAlert
          ? "Temporal voting kept elevated alert active."
          : "Temporal voting rejected unstable signal.";

  const nextAnalysis: AnalysisResult = {
    ...analysis,
    summary,
    threatRating: finalThreatRating,
    threatScore: Number((finalThreatRating / 100).toFixed(2)),
    threatLevel: finalThreatLevel,
    shouldAlert,
    alertReason,
    vapeSuspected: finalDetections.includes("person_vaping"),
    knifeSuspected: finalDetections.includes("person_with_possible_knife"),
    vapeConfidence: finalBehaviors.find((item) => item.label === "person_vaping")?.confidence ?? analysis.vapeConfidence,
    knifeConfidence:
      finalBehaviors.find((item) => item.label === "person_with_possible_knife")?.confidence ?? analysis.knifeConfidence,
    detectedBehaviors: finalBehaviors,
    likelyThreats: finalLikelyThreats,
    thinking: {
      ...analysis.thinking,
      escalationPath,
      temporal: {
        windowSize,
        requiredVotes,
        votes,
        latched,
        smoothing: {
          rawThreatRating,
          smoothedThreatRating: finalThreatRating
        },
        finalDetections
      }
    }
  };

  return {
    analysis: nextAnalysis,
    nextLatches,
    rawSignal: {
      capturedAt: new Date(nowMs).toISOString(),
      candidates: currentCandidates,
      threatRating: rawThreatRating
    }
  };
}

function cleanupExpiredSessions(): void {
  const now = Date.now();
  for (const [sessionId, session] of sessions.entries()) {
    if (now - Date.parse(session.latestFrame.receivedAt) > 5 * 60 * 1000) {
      sessions.delete(sessionId);
    }
  }
}

export function createVisionRouter(): Router {
  const router = Router();

  router.post("/session", (req, res, next) => {
    try {
      cleanupExpiredSessions();
      const payload = createSessionSchema.parse(req.body ?? {});
      const requested = payload.sessionId?.toUpperCase();
      const sessionId = requested && !sessions.has(requested) ? requested : randomSessionId();
      res.status(201).json({ sessionId });
    } catch (error) {
      next(error);
    }
  });

  router.post("/frame", async (req, res, next) => {
    try {
      cleanupExpiredSessions();
      const payload = uploadFrameSchema.parse(req.body);
      const sessionId = payload.sessionId.toUpperCase();
      const existing = sessions.get(sessionId);

      const metricHistory = existing?.metricHistory ?? [];
      const signalHistory = existing?.signalHistory ?? [];
      const capturedAtMs = Number.isFinite(Date.parse(payload.capturedAt)) ? Date.parse(payload.capturedAt) : Date.now();

      const modelConfigured = isModelConfigured(payload.runtime);
      console.log(`[Vision] Frame received for session ${sessionId}. Model Configured: ${modelConfigured}`);
      const candidateAnalysis = buildLocalAnalysis(
        payload.metrics,
        metricHistory.map((entry) => entry.metrics),
        modelConfigured
      );

      const temporal = applyTemporalDecisions(candidateAnalysis, signalHistory, existing?.latches, capturedAtMs);

      const frame: VisionFrame = {
        frameId: `${sessionId}-${Date.now()}`,
        imageDataUrl: payload.imageDataUrl,
        capturedAt: payload.capturedAt,
        receivedAt: new Date().toISOString(),
        metrics: payload.metrics,
        analysis: temporal.analysis
      };

      sessions.set(sessionId, {
        latestFrame: frame,
        metricHistory: [...metricHistory, { capturedAt: payload.capturedAt, metrics: payload.metrics }].slice(-20),
        signalHistory: [...signalHistory, temporal.rawSignal].slice(-40),
        latches: temporal.nextLatches
      });

      res.status(201).json({ frameId: frame.frameId, analysis: frame.analysis, receivedAt: frame.receivedAt });

      const lastModelTime = (existing as any)?.lastModelTime || 0;
      const now = Date.now();

      if (now - lastModelTime > 1200) {
        const sessionRef = sessions.get(sessionId);
        if (sessionRef) {
          (sessionRef as any).lastModelTime = now;
        }

        analyzeWithModel(payload.runtime, payload.imageDataUrl, payload.metrics)
          .then((modelAttempt) => {
            console.log(`[Vision] analyzeWithModel complete. Attempted: ${modelAttempt.attempted}, Source: ${modelAttempt.source}, Success: ${!!modelAttempt.decision}, Error: ${modelAttempt.error || 'none'}`);
            if (modelAttempt.decision) {
              console.log(`[Vision] AI Detected behaviors:`, modelAttempt.decision.likely_threats, `Threat rating: ${modelAttempt.decision.threat_rating}%`);
            }
            const currentSession = sessions.get(sessionId);
            if (currentSession && currentSession.latestFrame.frameId === frame.frameId) {
              let updatedAnalysis = candidateAnalysis;
              if (modelAttempt.decision && modelAttempt.source && modelAttempt.model) {
                updatedAnalysis = mergeModelDecision(candidateAnalysis, modelAttempt.source, modelAttempt.model, modelAttempt.decision);
              } else if (modelAttempt.attempted) {
                console.warn(`[Vision] Model failed. Falling back to local heuristics. Error: ${modelAttempt.error}`);
                const fallbackAnalysis = buildLocalAnalysis(
                  payload.metrics,
                  currentSession.metricHistory.map((entry) => entry.metrics),
                  false // fallback to full local heuristics
                );
                updatedAnalysis = {
                  ...fallbackAnalysis,
                  modelStatus: "fallback_local",
                  modelError: modelAttempt.error ?? "model_unavailable",
                  modelReasoning:
                    modelAttempt.error && !fallbackAnalysis.modelReasoning.includes(modelAttempt.error)
                      ? [...fallbackAnalysis.modelReasoning, `fallback:${modelAttempt.error}`]
                      : fallbackAnalysis.modelReasoning
                };
              }

              const updatedTemporal = applyTemporalDecisions(
                updatedAnalysis,
                currentSession.signalHistory,
                currentSession.latches,
                capturedAtMs
              );

              currentSession.latestFrame.analysis = updatedTemporal.analysis;
              currentSession.latches = updatedTemporal.nextLatches;
              currentSession.signalHistory = [...currentSession.signalHistory, updatedTemporal.rawSignal].slice(-40);
            }
          })
          .catch((err) => {
            console.error("Background AI Model analysis error:", err);
          });
      }
    } catch (error) {
      next(error);
    }
  });

  router.post("/feedback", (req, res, next) => {
    try {
      const payload = feedbackSchema.parse(req.body);
      const sessionId = payload.sessionId.toUpperCase();
      const entry: VisionFeedback = {
        id: `${sessionId}-${Date.now()}`,
        sessionId,
        frameId: payload.frameId,
        feedbackType: payload.feedbackType,
        expectedBehavior: payload.expectedBehavior,
        notes: payload.notes,
        createdAt: new Date().toISOString()
      };

      feedbackLog.push(entry);
      if (feedbackLog.length > 500) {
        feedbackLog.shift();
      }

      res.status(201).json({ ok: true, feedbackId: entry.id });
    } catch (error) {
      next(error);
    }
  });

  router.get("/session/:sessionId/latest", (req, res, next) => {
    try {
      cleanupExpiredSessions();
      const sessionId = req.params.sessionId.toUpperCase();
      const session = sessions.get(sessionId);
      if (!session) {
        res.status(404).json({ error: "No frames for this session yet." });
        return;
      }

      res.json({
        sessionId,
        frame: session.latestFrame
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
