import type { ConversationTurn } from "./conversation.ts";
import { filterValidConversationTurns } from "./conversation.ts";
import type {
  FalGenerationRoute,
  GenerateDesignRequest,
} from "./design-request.ts";
import type { ExecutionMode } from "./design-generation.ts";

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
export const MAX_IMAGE_BASE64_LENGTH = 5_000_000;

export const ALLOWED_TILED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
]);

const ALLOWED_FAL_ROUTES = new Set<FalGenerationRoute>([
  "fal_tiling",
  "fal_edit",
  "fal_controlnet",
  "fal_inpaint",
]);
const ALLOWED_CONTROL_TYPES = new Set(["lineart", "edge", "depth"]);

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

const getFalRoute = (
  payload: GenerateDesignRequest,
): FalGenerationRoute | null => {
  if (payload.route === undefined) {
    return "fal_tiling";
  }

  return ALLOWED_FAL_ROUTES.has(payload.route) ? payload.route : null;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const validateFalGeneratePayload = (
  payload: GenerateDesignRequest,
  executionMode: ExecutionMode = "auto",
): FalPayloadValidationResult => {
  if (executionMode === "render_from_analysis") {
    if (
      typeof payload.analysisWorkId !== "string" ||
      payload.analysisWorkId.trim().length === 0
    ) {
      return {
        ok: false,
        status: 400,
        body: { error: "analysisWorkId is required for render_from_analysis" },
      };
    }

    return {
      ok: true,
      conversationHistory: [],
    };
  }

  const route = getFalRoute(payload);

  if (!route) {
    return {
      ok: false,
      status: 400,
      body: { error: "invalid_fal_route" },
    };
  }

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
    (typeof payload.designContext.pattern !== "string" ||
      !payload.designContext.pattern.trim() ||
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

  if (route === "fal_tiling" || route === "fal_controlnet") {
    if (payload.designContext.ciPlacement !== "all-over") {
      return {
        ok: false,
        status: 400,
        body: { error: "ci_placement_must_be_all_over" },
      };
    }

    const tiledBase64Trimmed =
      typeof payload.tiledBase64 === "string" ? payload.tiledBase64.trim() : "";
    const hasTiledInput = tiledBase64Trimmed.length > 0;
    const hasReferenceInput =
      typeof payload.referenceImageBase64 === "string" &&
      payload.referenceImageBase64.trim().length > 0;

    if (route === "fal_tiling" && !hasTiledInput && !hasReferenceInput) {
      return {
        ok: false,
        status: 400,
        body: { error: "fal_tiling_requires_tiled_or_reference_image" },
      };
    }

    if (hasTiledInput && tiledBase64Trimmed.length > MAX_IMAGE_BASE64_LENGTH) {
      return {
        ok: false,
        status: 413,
        body: { error: "tiled_image_too_large" },
      };
    }

    if (
      hasTiledInput &&
      (typeof payload.tiledMimeType !== "string" ||
        !payload.tiledMimeType.trim() ||
        !ALLOWED_TILED_MIME_TYPES.has(payload.tiledMimeType))
    ) {
      return {
        ok: false,
        status: 400,
        body: { error: "invalid_tiled_mime_type" },
      };
    }
  }

  if (route === "fal_controlnet") {
    const hasStructureInput =
      typeof payload.structureImageBase64 === "string" &&
      payload.structureImageBase64.trim().length > 0;
    const controlType = payload.controlType ?? "lineart";

    if (!payload.tiledBase64?.trim() && !hasStructureInput) {
      return {
        ok: false,
        status: 400,
        body: { error: "fal_controlnet_requires_structure_or_tiled_image" },
      };
    }

    if (!ALLOWED_CONTROL_TYPES.has(controlType)) {
      return {
        ok: false,
        status: 400,
        body: { error: "invalid_control_type" },
      };
    }

    if (
      hasStructureInput &&
      (typeof payload.structureImageMimeType !== "string" ||
        !ALLOWED_TILED_MIME_TYPES.has(payload.structureImageMimeType))
    ) {
      return {
        ok: false,
        status: 400,
        body: { error: "invalid_structure_image_mime_type" },
      };
    }
  }

  if (
    route === "fal_edit" &&
    (typeof payload.baseImageUrl !== "string" || !payload.baseImageUrl.trim())
  ) {
    return {
      ok: false,
      status: 400,
      body: { error: "base_image_url_required" },
    };
  }

  if (route === "fal_inpaint") {
    const hasBaseImageUrl =
      typeof payload.baseImageUrl === "string" &&
      payload.baseImageUrl.trim().length > 0;
    const hasBaseImageBase64 =
      typeof payload.baseImageBase64 === "string" &&
      payload.baseImageBase64.trim().length > 0;
    const hasMaskBase64 =
      typeof payload.maskBase64 === "string" &&
      payload.maskBase64.trim().length > 0;

    if (!hasBaseImageUrl && !hasBaseImageBase64) {
      return {
        ok: false,
        status: 400,
        body: { error: "base_image_url_required" },
      };
    }

    if (!hasMaskBase64) {
      return {
        ok: false,
        status: 400,
        body: { error: "mask_base64_required" },
      };
    }

    if ((payload.maskBase64?.trim().length ?? 0) > MAX_IMAGE_BASE64_LENGTH) {
      return {
        ok: false,
        status: 413,
        body: { error: "mask_image_too_large" },
      };
    }

    if (
      typeof payload.maskMimeType !== "string" ||
      !ALLOWED_TILED_MIME_TYPES.has(payload.maskMimeType)
    ) {
      return {
        ok: false,
        status: 400,
        body: { error: "invalid_mask_mime_type" },
      };
    }

    if (
      typeof payload.editPrompt !== "string" ||
      payload.editPrompt.trim().length === 0 ||
      payload.editPrompt.length > 2000
    ) {
      return {
        ok: false,
        status: 400,
        body: { error: "edit_prompt_required" },
      };
    }
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
