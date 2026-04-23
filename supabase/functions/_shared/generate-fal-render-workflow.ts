import type { AiGenerationLogInsert } from "./log-generation.ts";

const trimOptional = (value: string | null | undefined): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const resolveRenderWorkflowContext = (input: {
  payloadWorkflowId?: string | null;
  payloadPrepWorkId?: string | null;
  analysisSnapshot: {
    workflowId: string;
    analysisWorkId: string;
  } | null;
}) => {
  const workflowId =
    input.analysisSnapshot?.workflowId ??
    trimOptional(input.payloadWorkflowId) ??
    crypto.randomUUID();
  const analysisWorkId =
    input.analysisSnapshot?.analysisWorkId ?? `${workflowId}_analysis`;
  // This fallback work id can be orphaned when no FK enforces analysis-log existence.
  const parentWorkId =
    input.analysisSnapshot?.analysisWorkId ??
    trimOptional(input.payloadPrepWorkId) ??
    analysisWorkId;

  return {
    workflowId,
    analysisWorkId,
    renderWorkId: `${workflowId}_render`,
    parentWorkId,
  };
};

export const buildArtifactWarningMessage = (
  artifactFailures: Array<{
    artifactType: string;
    error: string;
  }>,
) => {
  if (artifactFailures.length === 0) {
    return undefined;
  }

  return JSON.stringify(artifactFailures);
};

export const buildInitialRenderLogPayload = (input: {
  workId: string;
  workflowId: string;
  parentWorkId: string;
  userId: string;
  userMessage: string;
  promptLength: number;
  route: AiGenerationLogInsert["route"];
  routeReason: AiGenerationLogInsert["route_reason"];
  routeSignals: AiGenerationLogInsert["route_signals"];
  imageGenerated: boolean;
  tokensCharged: number;
  artifactFailures?: Array<{
    artifactType: string;
    error: string;
  }>;
}): AiGenerationLogInsert => ({
  work_id: input.workId,
  workflow_id: input.workflowId,
  phase: "render",
  parent_work_id: input.parentWorkId,
  user_id: input.userId,
  ai_model: "fal",
  request_type: "render_standard",
  user_message: input.userMessage,
  prompt_length: input.promptLength,
  route: input.route,
  route_reason: input.routeReason,
  route_signals: input.routeSignals,
  image_generated: input.imageGenerated,
  tokens_charged: input.tokensCharged,
});

export const appendArtifactWarnings = (
  baseMessage: string | null | undefined,
  artifactFailures: Array<{
    artifactType: string;
    error: string;
  }>,
) => {
  const artifactWarningMessage = buildArtifactWarningMessage(artifactFailures);

  if (!artifactWarningMessage) {
    return baseMessage ?? undefined;
  }

  if (!baseMessage || baseMessage.trim().length === 0) {
    return `artifact_warnings: ${artifactWarningMessage}`;
  }

  return `${baseMessage} | artifact_warnings: ${artifactWarningMessage}`;
};
