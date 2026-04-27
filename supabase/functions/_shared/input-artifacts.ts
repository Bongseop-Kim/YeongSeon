import type { SupabaseClient } from "@supabase/supabase-js";
import type { GenerateDesignRequest } from "@/functions/_shared/design-request.ts";
import {
  createArtifactRowRpcRecorder,
  saveGenerationArtifact,
  type SaveGenerationArtifactResult,
} from "@/functions/_shared/generation-artifacts.ts";

type SourceInputKind = "source" | "ci" | "reference";

type SourceInputCandidate = {
  base64: string;
  mimeType?: string;
  inputKind: SourceInputKind;
};

type SourceInputPayload = Partial<
  Pick<
    GenerateDesignRequest,
    | "sourceImageBase64"
    | "sourceImageMimeType"
    | "ciImageBase64"
    | "ciImageMimeType"
    | "referenceImageBase64"
    | "referenceImageMimeType"
  >
>;

type RecordSourceInputArtifactParams = {
  adminClient: Pick<SupabaseClient, "rpc">;
  workflowId: string;
  sourceWorkId: string;
  phase: "analysis" | "prep" | "render";
  payload: SourceInputPayload;
  saveArtifact?: typeof saveGenerationArtifact;
};

const toNonEmptyString = (value: string | undefined): string | null => {
  const trimmedValue = value?.trim();
  return trimmedValue ? trimmedValue : null;
};

const resolveSourceInputCandidate = (
  payload: SourceInputPayload,
): SourceInputCandidate | null => {
  const sourceImageBase64 = toNonEmptyString(payload.sourceImageBase64);
  if (sourceImageBase64) {
    return {
      base64: sourceImageBase64,
      mimeType: toNonEmptyString(payload.sourceImageMimeType) ?? undefined,
      inputKind: "source",
    };
  }

  const ciImageBase64 = toNonEmptyString(payload.ciImageBase64);
  if (ciImageBase64) {
    return {
      base64: ciImageBase64,
      mimeType: toNonEmptyString(payload.ciImageMimeType) ?? undefined,
      inputKind: "ci",
    };
  }

  const referenceImageBase64 = toNonEmptyString(payload.referenceImageBase64);
  if (referenceImageBase64) {
    return {
      base64: referenceImageBase64,
      mimeType: toNonEmptyString(payload.referenceImageMimeType) ?? undefined,
      inputKind: "reference",
    };
  }

  return null;
};

export async function recordSourceInputArtifact(
  params: RecordSourceInputArtifactParams,
): Promise<SaveGenerationArtifactResult | null> {
  const candidate = resolveSourceInputCandidate(params.payload);
  if (!candidate) {
    return null;
  }

  const recordArtifact = params.saveArtifact ?? saveGenerationArtifact;

  return await recordArtifact(
    {
      workflowId: params.workflowId,
      phase: params.phase,
      artifactType: "source_input",
      sourceWorkId: params.sourceWorkId,
      image: {
        kind: "base64",
        base64: candidate.base64,
        mimeType: candidate.mimeType,
      },
      meta: {
        inputKind: candidate.inputKind,
      },
    },
    {
      recordArtifactRow: createArtifactRowRpcRecorder(params.adminClient),
    },
  );
}
