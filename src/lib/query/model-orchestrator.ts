/**
 * Gemini Model Orchestration Module
 *
 * Implements a sophisticated model selection strategy that:
 * 1. Defaults to fast, high-throughput models (Flash-class)
 * 2. Escalates to higher-capability models only when needed
 * 3. Handles rate limits by switching models or deferring
 * 4. Optimizes for throughput and minimizes redundant retries
 * 5. Maintains graceful degradation
 */

import { generateObject, generateText, type GenerateObjectResult, type GenerateTextResult, type CoreTool } from "ai";
import { google } from "@ai-sdk/google";
import type { z } from "zod";

// Model tier definitions (ordered by capability, cost, and latency)
export const MODEL_TIERS = {
  // Tier 1: Fast, high-throughput models (default)
  flash: ["gemini-2.5-flash-lite", "gemini-2.5-flash"] as const,
  // Tier 2: Higher-capability models (escalation only)
  pro: ["gemini-2.5-pro-preview-05-06", "gemini-2.0-pro"] as const,
} as const;

type FlashModel = (typeof MODEL_TIERS.flash)[number];
type ProModel = (typeof MODEL_TIERS.pro)[number];
type GeminiModel = FlashModel | ProModel;

// Error classification for deciding escalation vs. retry vs. defer
interface ErrorClassification {
  type: "rate_limit" | "quota_exhausted" | "token_limit" | "ambiguity" | "reasoning_failure" | "transient" | "unknown";
  shouldEscalate: boolean;
  shouldRetry: boolean;
  shouldDefer: boolean;
}

// Model quota tracking (per-session in-memory state)
interface ModelQuotaState {
  modelName: GeminiModel;
  requestsThisMinute: number;
  requestsToday: number;
  lastRequestTime: number;
  minuteResetTime: number;
  dayResetTime: number;
  isRateLimited: boolean;
  rateLimitResetTime: number | null;
}

// Orchestrator configuration
interface OrchestratorConfig {
  maxRetriesPerModel: number;
  enableEscalation: boolean;
  enableDeferral: boolean;
  deferralQueueEnabled: boolean;
}

const DEFAULT_CONFIG: OrchestratorConfig = {
  maxRetriesPerModel: 1,
  enableEscalation: true,
  enableDeferral: true,
  deferralQueueEnabled: false, // Queue persistence not implemented in this version
};

// Global quota state (in-memory, resets on process restart)
const quotaState = new Map<GeminiModel, ModelQuotaState>();

// Deferred request queue (in-memory)
interface DeferredRequest<T> {
  id: string;
  execute: () => Promise<T>;
  createdAt: number;
  retryAfter: number;
}
const deferralQueue: DeferredRequest<unknown>[] = [];

/**
 * Initialize quota state for a model
 */
function initQuotaState(modelName: GeminiModel): ModelQuotaState {
  const now = Date.now();
  return {
    modelName,
    requestsThisMinute: 0,
    requestsToday: 0,
    lastRequestTime: 0,
    minuteResetTime: now + 60_000,
    dayResetTime: now + 86_400_000,
    isRateLimited: false,
    rateLimitResetTime: null,
  };
}

/**
 * Get or initialize quota state for a model
 */
function getQuotaState(modelName: GeminiModel): ModelQuotaState {
  if (!quotaState.has(modelName)) {
    quotaState.set(modelName, initQuotaState(modelName));
  }
  return quotaState.get(modelName)!;
}

/**
 * Update quota state after a request
 */
function recordRequest(modelName: GeminiModel): void {
  const state = getQuotaState(modelName);
  const now = Date.now();

  // Reset minute counter if needed
  if (now > state.minuteResetTime) {
    state.requestsThisMinute = 0;
    state.minuteResetTime = now + 60_000;
  }

  // Reset day counter if needed
  if (now > state.dayResetTime) {
    state.requestsToday = 0;
    state.dayResetTime = now + 86_400_000;
  }

  state.requestsThisMinute++;
  state.requestsToday++;
  state.lastRequestTime = now;
}

/**
 * Mark a model as rate-limited
 */
function markRateLimited(modelName: GeminiModel, retryAfterMs: number = 60_000): void {
  const state = getQuotaState(modelName);
  state.isRateLimited = true;
  state.rateLimitResetTime = Date.now() + retryAfterMs;
}

/**
 * Check if a model is currently available (not rate-limited)
 */
function isModelAvailable(modelName: GeminiModel): boolean {
  const state = getQuotaState(modelName);
  if (!state.isRateLimited) return true;

  const now = Date.now();
  if (state.rateLimitResetTime && now > state.rateLimitResetTime) {
    state.isRateLimited = false;
    state.rateLimitResetTime = null;
    return true;
  }

  return false;
}

/**
 * Get available models from a tier
 */
function getAvailableModels<T extends GeminiModel>(models: readonly T[]): T[] {
  return models.filter((m) => isModelAvailable(m));
}

/**
 * Classify an error to determine the appropriate response strategy
 */
function classifyError(error: unknown): ErrorClassification {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  // Rate limiting errors (RPM/RPD limits)
  if (
    message.includes("rate limit") ||
    message.includes("rate_limit") ||
    message.includes("too many requests") ||
    message.includes("429")
  ) {
    return {
      type: "rate_limit",
      shouldEscalate: false,
      shouldRetry: false,
      shouldDefer: true,
    };
  }

  // Quota exhaustion
  if (
    message.includes("quota") ||
    message.includes("resource exhausted") ||
    message.includes("resource_exhausted")
  ) {
    return {
      type: "quota_exhausted",
      shouldEscalate: false,
      shouldRetry: false,
      shouldDefer: true,
    };
  }

  // Token limit errors
  if (
    message.includes("token") &&
    (message.includes("limit") || message.includes("exceeded") || message.includes("too long"))
  ) {
    return {
      type: "token_limit",
      shouldEscalate: false,
      shouldRetry: false,
      shouldDefer: false,
    };
  }

  // Ambiguity or low confidence (may benefit from escalation)
  if (
    message.includes("ambiguous") ||
    message.includes("unclear") ||
    message.includes("cannot determine") ||
    message.includes("insufficient context")
  ) {
    return {
      type: "ambiguity",
      shouldEscalate: true,
      shouldRetry: false,
      shouldDefer: false,
    };
  }

  // Complex reasoning failures
  if (
    message.includes("reasoning") ||
    message.includes("complex") ||
    message.includes("multi-step") ||
    message.includes("inference")
  ) {
    return {
      type: "reasoning_failure",
      shouldEscalate: true,
      shouldRetry: false,
      shouldDefer: false,
    };
  }

  // Transient errors (network, timeout)
  if (
    message.includes("timeout") ||
    message.includes("network") ||
    message.includes("connection") ||
    message.includes("503") ||
    message.includes("504")
  ) {
    return {
      type: "transient",
      shouldEscalate: false,
      shouldRetry: true,
      shouldDefer: false,
    };
  }

  // Unknown errors - conservative approach
  return {
    type: "unknown",
    shouldEscalate: false,
    shouldRetry: true,
    shouldDefer: false,
  };
}

/**
 * Extract retry-after duration from error if available
 */
function extractRetryAfter(error: unknown): number {
  const message = error instanceof Error ? error.message : String(error);
  const match = message.match(/retry.?after[:\s]+(\d+)/i);
  if (match) {
    return parseInt(match[1], 10) * 1000; // Convert to ms
  }
  return 60_000; // Default 1 minute
}

/**
 * Result wrapper for orchestrated calls
 */
export interface OrchestratedResult<T> {
  result: T;
  modelUsed: GeminiModel;
  attempts: number;
  escalated: boolean;
  deferred: boolean;
}

/**
 * Options for orchestrated generation
 */
export interface OrchestrationOptions {
  preferredTier?: "flash" | "pro";
  allowEscalation?: boolean;
  taskComplexity?: "simple" | "moderate" | "complex";
}

/**
 * Core orchestration logic for generateObject calls
 */
export async function orchestratedGenerateObject<T extends z.ZodType>(
  options: {
    schema: T;
    prompt: string;
    orchestration?: OrchestrationOptions;
  },
  config: Partial<OrchestratorConfig> = {},
): Promise<OrchestratedResult<GenerateObjectResult<z.infer<T>>>> {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const orchestration = options.orchestration ?? {};

  // Determine starting tier based on task complexity
  const startTier = orchestration.preferredTier ?? (orchestration.taskComplexity === "complex" ? "pro" : "flash");
  const allowEscalation = orchestration.allowEscalation ?? mergedConfig.enableEscalation;

  let attempts = 0;
  let escalated = false;
  let deferred = false;
  let lastError: unknown;

  // Try flash tier first (unless explicitly requesting pro)
  const flashModels = startTier === "flash" ? getAvailableModels(MODEL_TIERS.flash) : [];

  for (const modelName of flashModels) {
    for (let retry = 0; retry <= mergedConfig.maxRetriesPerModel; retry++) {
      attempts++;
      try {
        recordRequest(modelName);
        const result = await generateObject({
          model: google(modelName),
          schema: options.schema,
          prompt: options.prompt,
        });

        return {
          result,
          modelUsed: modelName,
          attempts,
          escalated,
          deferred,
        };
      } catch (error) {
        lastError = error;
        const classification = classifyError(error);

        if (classification.type === "rate_limit" || classification.type === "quota_exhausted") {
          markRateLimited(modelName, extractRetryAfter(error));
          break; // Try next model, don't retry this one
        }

        if (!classification.shouldRetry) {
          break; // Don't retry, try next model or escalate
        }
      }
    }
  }

  // Escalate to pro tier if allowed and appropriate
  if (allowEscalation) {
    const proModels = getAvailableModels(MODEL_TIERS.pro);
    escalated = proModels.length > 0;

    for (const modelName of proModels) {
      for (let retry = 0; retry <= mergedConfig.maxRetriesPerModel; retry++) {
        attempts++;
        try {
          recordRequest(modelName);
          const result = await generateObject({
            model: google(modelName),
            schema: options.schema,
            prompt: options.prompt,
          });

          return {
            result,
            modelUsed: modelName,
            attempts,
            escalated,
            deferred,
          };
        } catch (error) {
          lastError = error;
          const classification = classifyError(error);

          if (classification.type === "rate_limit" || classification.type === "quota_exhausted") {
            markRateLimited(modelName, extractRetryAfter(error));
            break;
          }

          if (!classification.shouldRetry) {
            break;
          }
        }
      }
    }
  }

  // All models exhausted
  throw lastError instanceof Error ? lastError : new Error("All models exhausted or rate-limited");
}

/**
 * Core orchestration logic for generateText calls
 */
export async function orchestratedGenerateText(
  options: {
    prompt: string;
    orchestration?: OrchestrationOptions;
    tools?: Record<string, CoreTool>;
    maxSteps?: number;
  },
  config: Partial<OrchestratorConfig> = {},
): Promise<OrchestratedResult<GenerateTextResult<Record<string, CoreTool>, never>>> {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const orchestration = options.orchestration ?? {};

  const startTier = orchestration.preferredTier ?? "flash";
  const allowEscalation = orchestration.allowEscalation ?? mergedConfig.enableEscalation;

  let attempts = 0;
  let escalated = false;
  let deferred = false;
  let lastError: unknown;

  const flashModels = startTier === "flash" ? getAvailableModels(MODEL_TIERS.flash) : [];

  for (const modelName of flashModels) {
    for (let retry = 0; retry <= mergedConfig.maxRetriesPerModel; retry++) {
      attempts++;
      try {
        recordRequest(modelName);
        const result = await generateText({
          model: google(modelName),
          prompt: options.prompt,
          tools: options.tools,
          maxSteps: options.maxSteps,
        });

        return {
          result,
          modelUsed: modelName,
          attempts,
          escalated,
          deferred,
        };
      } catch (error) {
        lastError = error;
        const classification = classifyError(error);

        if (classification.type === "rate_limit" || classification.type === "quota_exhausted") {
          markRateLimited(modelName, extractRetryAfter(error));
          break;
        }

        if (!classification.shouldRetry) {
          break;
        }
      }
    }
  }

  if (allowEscalation) {
    const proModels = getAvailableModels(MODEL_TIERS.pro);
    escalated = proModels.length > 0;

    for (const modelName of proModels) {
      for (let retry = 0; retry <= mergedConfig.maxRetriesPerModel; retry++) {
        attempts++;
        try {
          recordRequest(modelName);
          const result = await generateText({
            model: google(modelName),
            prompt: options.prompt,
            tools: options.tools,
            maxSteps: options.maxSteps,
          });

          return {
            result,
            modelUsed: modelName,
            attempts,
            escalated,
            deferred,
          };
        } catch (error) {
          lastError = error;
          const classification = classifyError(error);

          if (classification.type === "rate_limit" || classification.type === "quota_exhausted") {
            markRateLimited(modelName, extractRetryAfter(error));
            break;
          }

          if (!classification.shouldRetry) {
            break;
          }
        }
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("All models exhausted or rate-limited");
}

/**
 * Simple wrapper for quick flash-only calls (no escalation)
 * Use for high-volume, simple tasks
 */
export async function flashGenerateObject<T extends z.ZodType>(
  schema: T,
  prompt: string,
): Promise<{ result: GenerateObjectResult<z.infer<T>>; modelUsed: GeminiModel }> {
  const orchestrated = await orchestratedGenerateObject(
    { schema, prompt, orchestration: { preferredTier: "flash", allowEscalation: false } },
    { maxRetriesPerModel: 1 },
  );
  return { result: orchestrated.result, modelUsed: orchestrated.modelUsed };
}

/**
 * Simple wrapper for quick flash-only text generation
 */
export async function flashGenerateText(
  prompt: string,
): Promise<{ result: GenerateTextResult<Record<string, CoreTool>, never>; modelUsed: GeminiModel }> {
  const orchestrated = await orchestratedGenerateText(
    { prompt, orchestration: { preferredTier: "flash", allowEscalation: false } },
    { maxRetriesPerModel: 1 },
  );
  return { result: orchestrated.result, modelUsed: orchestrated.modelUsed };
}

/**
 * Get current quota/rate limit status for monitoring
 */
export function getQuotaStatus(): Record<GeminiModel, { available: boolean; rateLimitedUntil: number | null }> {
  const allModels = [...MODEL_TIERS.flash, ...MODEL_TIERS.pro] as GeminiModel[];
  const status: Record<string, { available: boolean; rateLimitedUntil: number | null }> = {};

  for (const model of allModels) {
    const state = getQuotaState(model);
    status[model] = {
      available: isModelAvailable(model),
      rateLimitedUntil: state.rateLimitResetTime,
    };
  }

  return status as Record<GeminiModel, { available: boolean; rateLimitedUntil: number | null }>;
}

/**
 * Reset quota state (for testing or manual intervention)
 */
export function resetQuotaState(): void {
  quotaState.clear();
}

/**
 * Process deferred requests (call periodically or on-demand)
 */
export async function processDeferredRequests(): Promise<number> {
  const now = Date.now();
  let processed = 0;

  const ready = deferralQueue.filter((req) => req.retryAfter <= now);

  for (const request of ready) {
    try {
      await request.execute();
      const index = deferralQueue.indexOf(request);
      if (index > -1) {
        deferralQueue.splice(index, 1);
      }
      processed++;
    } catch {
      // Re-defer with backoff
      request.retryAfter = now + 60_000;
    }
  }

  return processed;
}
