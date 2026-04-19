import type { ConversationTurn } from "./conversation.ts";
import { filterValidConversationTurns } from "./conversation.ts";
import type { GenerateDesignRequest } from "./design-request.ts";

const ALLOWED_FABRIC_METHODS = new Set(["yarn-dyed", "print"]);
const ALLOWED_CI_PLACEMENTS = new Set(["all-over", "one-point"]);
const ALLOWED_SCALES = new Set(["large", "medium", "small"]);
const ALLOWED_PATTERNS = new Set([
  "stripe",
  "dot",
  "check",
  "paisley",
  "plain",
  "houndstooth",
  "floral",
]);

const MAX_HISTORY_TURNS = 20;
const MAX_IMAGE_BASE64_LENGTH = 5_000_000;

export const ALLOWED_TILED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
]);

type ValidationFailure = {
  ok: false;
  status: number;
  body: { error: string };
};

type ValidationSuccess = {
  ok: true;
  conversationHistory: ConversationTurn[];
};

export type FalPayloadValidationResult = ValidationFailure | ValidationSuccess;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const validateFalGeneratePayload = (
  payload: GenerateDesignRequest,
): FalPayloadValidationResult => {
  if (
    typeof payload.userMessage !== "string" ||
    !payload.userMessage.trim() ||
    payload.userMessage.length > 4000
  ) {
    return {
      ok: false,
      status: 400,
      body: { error: "invalid_user_message" },
    };
  }

  if (
    payload.designContext !== undefined &&
    !isPlainObject(payload.designContext)
  ) {
    return {
      ok: false,
      status: 400,
      body: { error: "designContext must be an object" },
    };
  }

  if (
    payload.designContext?.colors !== undefined &&
    (!Array.isArray(payload.designContext.colors) ||
      payload.designContext.colors.some(
        (color: unknown) => typeof color !== "string",
      ))
  ) {
    return {
      ok: false,
      status: 400,
      body: { error: "designContext.colors must be an array of strings" },
    };
  }

  if (
    payload.designContext?.pattern !== undefined &&
    payload.designContext.pattern !== null &&
    (!payload.designContext.pattern.trim() ||
      !ALLOWED_PATTERNS.has(payload.designContext.pattern))
  ) {
    return {
      ok: false,
      status: 400,
      body: { error: "invalid_design_pattern" },
    };
  }

  if (
    payload.designContext?.fabricMethod === undefined ||
    payload.designContext.fabricMethod === null ||
    typeof payload.designContext.fabricMethod !== "string" ||
    !ALLOWED_FABRIC_METHODS.has(payload.designContext.fabricMethod)
  ) {
    return {
      ok: false,
      status: 400,
      body: { error: "fabric_method_required" },
    };
  }

  if (
    payload.designContext?.ciPlacement === undefined ||
    payload.designContext.ciPlacement === null ||
    typeof payload.designContext.ciPlacement !== "string" ||
    !ALLOWED_CI_PLACEMENTS.has(payload.designContext.ciPlacement)
  ) {
    return {
      ok: false,
      status: 400,
      body: { error: "invalid_ci_placement" },
    };
  }

  if (payload.designContext.ciPlacement !== "all-over") {
    return {
      ok: false,
      status: 400,
      body: { error: "ci_placement_must_be_all_over" },
    };
  }

  if (
    payload.designContext.scale !== undefined &&
    payload.designContext.scale !== null &&
    !ALLOWED_SCALES.has(payload.designContext.scale)
  ) {
    return {
      ok: false,
      status: 400,
      body: { error: "invalid_design_scale" },
    };
  }

  if (typeof payload.tiledBase64 !== "string" || !payload.tiledBase64.trim()) {
    return {
      ok: false,
      status: 400,
      body: { error: "tiledBase64 must be a non-empty string" },
    };
  }

  if (payload.tiledBase64.length > MAX_IMAGE_BASE64_LENGTH) {
    return {
      ok: false,
      status: 413,
      body: { error: "tiled_image_too_large" },
    };
  }

  if (
    typeof payload.tiledMimeType !== "string" ||
    !payload.tiledMimeType.trim() ||
    !ALLOWED_TILED_MIME_TYPES.has(payload.tiledMimeType)
  ) {
    return {
      ok: false,
      status: 400,
      body: {
        error: `tiledMimeType must be one of: ${Array.from(ALLOWED_TILED_MIME_TYPES).join(", ")}`,
      },
    };
  }

  const rawConversationHistory = payload.conversationHistory;

  if (
    rawConversationHistory !== undefined &&
    !Array.isArray(rawConversationHistory)
  ) {
    return {
      ok: false,
      status: 400,
      body: { error: "conversationHistory must be an array" },
    };
  }

  if ((rawConversationHistory?.length ?? 0) > MAX_HISTORY_TURNS) {
    return {
      ok: false,
      status: 400,
      body: { error: "conversationHistory too long" },
    };
  }

  const conversationHistory = filterValidConversationTurns(
    rawConversationHistory,
  );

  if (
    (rawConversationHistory?.length ?? 0) > 0 &&
    conversationHistory.length === 0
  ) {
    return {
      ok: false,
      status: 400,
      body: { error: "no valid conversationHistory turns" },
    };
  }

  return {
    ok: true,
    conversationHistory,
  };
};

export const shouldProceedToFalRender = (
  generateImage: boolean,
  eligibility: {
    eligibleForRender: boolean;
    missingRequirements: string[];
  },
): boolean =>
  generateImage &&
  eligibility.eligibleForRender &&
  eligibility.missingRequirements.length === 0;
