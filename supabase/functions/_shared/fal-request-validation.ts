import type { ConversationTurn } from "./conversation.ts";
import { filterValidConversationTurns } from "./conversation.ts";
import type {
  GenerationRoute,
  GenerateDesignRequest,
} from "./design-request.ts";
import type { ExecutionMode } from "@/functions/_shared/design-generation.ts";

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

const ALLOWED_FAL_ROUTES = new Set<GenerationRoute>([
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
): GenerationRoute | null => {
  if (payload.route === undefined) {
    return "fal_tiling";
  }

  return ALLOWED_FAL_ROUTES.has(payload.route) ? payload.route : null;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const getTrimmedBase64 = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const validateImageBase64Length = (
  value: string,
  error: string,
): ValidationFailure | null => {
  if (value.length <= MAX_IMAGE_BASE64_LENGTH) {
    return null;
  }

  return {
    ok: false,
    status: 413,
    body: { error },
  };
};

const getInvalidUserMessageFailure = (
  payload: GenerateDesignRequest,
): ValidationFailure | null => {
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

  return null;
};

export const validateFalGeneratePayload = (
  payload: GenerateDesignRequest,
  executionMode: ExecutionMode = "auto",
): FalPayloadValidationResult => {
  const route = getFalRoute(payload);

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

    if (!route) {
      return {
        ok: false,
        status: 400,
        body: { error: "invalid_fal_route" },
      };
    }

    const userMessageFailure = getInvalidUserMessageFailure(payload);
    if (userMessageFailure) {
      return userMessageFailure;
    }

    return {
      ok: true,
      conversationHistory: [],
    };
  }

  if (!route) {
    return {
      ok: false,
      status: 400,
      body: { error: "invalid_fal_route" },
    };
  }

  const userMessageFailure = getInvalidUserMessageFailure(payload);
  if (userMessageFailure) {
    return userMessageFailure;
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

  let tiledBase64Trimmed = "";
  let hasTiledInput = false;

  if (route === "fal_tiling" || route === "fal_controlnet") {
    if (payload.designContext.ciPlacement !== "all-over") {
      return {
        ok: false,
        status: 400,
        body: { error: "ci_placement_must_be_all_over" },
      };
    }

    tiledBase64Trimmed = getTrimmedBase64(payload.tiledBase64);
    const referenceImageBase64Trimmed = getTrimmedBase64(
      payload.referenceImageBase64,
    );
    hasTiledInput = tiledBase64Trimmed.length > 0;
    const hasReferenceInput = referenceImageBase64Trimmed.length > 0;

    if (route === "fal_tiling" && !hasTiledInput && !hasReferenceInput) {
      return {
        ok: false,
        status: 400,
        body: { error: "fal_tiling_requires_tiled_or_reference_image" },
      };
    }

    if (hasTiledInput) {
      const tiledImageLengthValidation = validateImageBase64Length(
        tiledBase64Trimmed,
        "tiled_image_too_large",
      );
      if (tiledImageLengthValidation) {
        return tiledImageLengthValidation;
      }
    }

    if (hasReferenceInput) {
      const referenceImageLengthValidation = validateImageBase64Length(
        referenceImageBase64Trimmed,
        "reference_image_too_large",
      );
      if (referenceImageLengthValidation) {
        return referenceImageLengthValidation;
      }
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
    const structureImageBase64Trimmed = getTrimmedBase64(
      payload.structureImageBase64,
    );
    const hasStructureInput = structureImageBase64Trimmed.length > 0;
    const controlType = payload.controlType ?? "lineart";

    if (tiledBase64Trimmed.length === 0 && !hasStructureInput) {
      return {
        ok: false,
        status: 400,
        body: { error: "fal_controlnet_requires_structure_or_tiled_image" },
      };
    }

    if (
      typeof controlType !== "string" ||
      !ALLOWED_CONTROL_TYPES.has(controlType)
    ) {
      return {
        ok: false,
        status: 400,
        body: { error: "invalid_control_type" },
      };
    }

    if (hasStructureInput) {
      const structureImageLengthValidation = validateImageBase64Length(
        structureImageBase64Trimmed,
        "structure_image_too_large",
      );
      if (structureImageLengthValidation) {
        return structureImageLengthValidation;
      }
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
    const baseImageBase64Trimmed = getTrimmedBase64(payload.baseImageBase64);
    const maskBase64Trimmed = getTrimmedBase64(payload.maskBase64);
    const hasBaseImageUrl =
      typeof payload.baseImageUrl === "string" &&
      payload.baseImageUrl.trim().length > 0;
    const hasBaseImageBase64 = baseImageBase64Trimmed.length > 0;
    const hasMaskBase64 = maskBase64Trimmed.length > 0;

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

    if (hasBaseImageBase64) {
      const baseImageLengthValidation = validateImageBase64Length(
        baseImageBase64Trimmed,
        "base_image_too_large",
      );
      if (baseImageLengthValidation) {
        return baseImageLengthValidation;
      }
    }

    if (hasMaskBase64) {
      const maskImageLengthValidation = validateImageBase64Length(
        maskBase64Trimmed,
        "mask_image_too_large",
      );
      if (maskImageLengthValidation) {
        return maskImageLengthValidation;
      }
    }

    if (
      typeof payload.maskMimeType !== "string" ||
      payload.maskMimeType.trim().length === 0 ||
      !ALLOWED_TILED_MIME_TYPES.has(payload.maskMimeType.trim())
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
