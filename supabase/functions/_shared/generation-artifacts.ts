import {
  uploadBytesToImageKit,
  type ImageKitUploadResult,
} from "@/functions/_shared/imagekit-upload.ts";

export type GenerationArtifactPhase = "analysis" | "prep" | "render";

export type GenerationArtifactImageInput =
  | {
      kind: "base64";
      base64: string;
      mimeType?: string;
    }
  | {
      kind: "buffer";
      bytes: Uint8Array;
      mimeType: string;
    }
  | {
      kind: "url";
      url: string;
    };

export type SaveGenerationArtifactInput = {
  workflowId: string;
  phase: GenerationArtifactPhase;
  artifactType: string;
  sourceWorkId?: string | null;
  parentArtifactId?: string | null;
  image: GenerationArtifactImageInput;
  meta?: Record<string, unknown>;
};

export type GenerationArtifactRow = {
  id: string;
  workflow_id: string;
  phase: GenerationArtifactPhase;
  artifact_type: string;
  source_work_id: string | null;
  parent_artifact_id: string | null;
  storage_provider: string;
  image_url: string | null;
  image_width: number | null;
  image_height: number | null;
  mime_type: string | null;
  file_size_bytes: number | null;
  status: "success" | "partial" | "failed";
  meta: Record<string, unknown>;
};

export type SaveGenerationArtifactResult = {
  artifactId: string;
  status: "success" | "partial" | "failed";
  imageUrl: string | null;
  error: string | null;
};

export type SaveGenerationArtifactDeps = {
  generateArtifactId?: () => string;
  uploadImage?: (input: {
    bytes: Uint8Array;
    mimeType: string;
    fileName: string;
    folder: string;
  }) => Promise<ImageKitUploadResult | null>;
  recordArtifactRow: (row: GenerationArtifactRow) =>
    | Promise<{ error: { message: string } | null } | void>
    | {
        error: { message: string } | null;
      }
    | void;
};

const DEFAULT_UPLOAD_FOLDER = "/ai-generation-artifacts";
const DEFAULT_MIME_TYPE = "image/png";

const MIME_EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

const stripDataUriPrefix = (
  value: string,
): { mimeType: string | null; base64: string } => {
  const trimmedValue = value.trim();
  if (!trimmedValue.startsWith("data:")) {
    return { mimeType: null, base64: trimmedValue };
  }

  const commaIndex = trimmedValue.indexOf(",");
  if (commaIndex < 0) {
    return { mimeType: null, base64: trimmedValue };
  }

  const header = trimmedValue.slice(5, commaIndex);
  const mimeType = header.endsWith(";base64")
    ? header.slice(0, -";base64".length)
    : null;

  return {
    mimeType,
    base64: trimmedValue.slice(commaIndex + 1),
  };
};

const decodeBase64 = (base64: string): Uint8Array => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
};

const getMimeType = (input: { mimeType?: string; base64: string }): string => {
  const parsed = stripDataUriPrefix(input.base64);
  return input.mimeType?.trim() || parsed.mimeType || DEFAULT_MIME_TYPE;
};

const getBytes = (
  input: GenerationArtifactImageInput,
): {
  bytes: Uint8Array;
  mimeType: string;
  fileSizeBytes: number;
} | null => {
  if (input.kind === "url") {
    return null;
  }

  if (input.kind === "buffer") {
    return {
      bytes: input.bytes,
      mimeType: input.mimeType.trim() || DEFAULT_MIME_TYPE,
      fileSizeBytes: input.bytes.byteLength,
    };
  }

  const mimeType = getMimeType({
    base64: input.base64,
    mimeType: input.mimeType,
  });
  const parsed = stripDataUriPrefix(input.base64);
  const bytes = decodeBase64(parsed.base64);

  return {
    bytes,
    mimeType,
    fileSizeBytes: bytes.byteLength,
  };
};

const getFileExtension = (mimeType: string): string =>
  MIME_EXTENSIONS[mimeType.toLowerCase()] ?? "png";

const getUploadFolder = (
  workflowId: string,
  phase: GenerationArtifactPhase,
): string => `${DEFAULT_UPLOAD_FOLDER}/${workflowId}/${phase}`;

const normalizeErrorMessage = (value: unknown): string => {
  if (value instanceof Error) {
    return value.message;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  return "artifact_save_failed";
};

const buildRecordMeta = (
  meta: Record<string, unknown> | undefined,
  error: string | null,
): Record<string, unknown> => ({
  ...(meta ?? {}),
  ...(error ? { error } : {}),
});

const resolveRecordError = (
  result:
    | { error: { message: string } | null }
    | void
    | Promise<{ error: { message: string } | null } | void>,
): Promise<string | null> =>
  Promise.resolve(result).then((resolved) => resolved?.error?.message ?? null);

export async function saveGenerationArtifact(
  input: SaveGenerationArtifactInput,
  deps: SaveGenerationArtifactDeps,
): Promise<SaveGenerationArtifactResult> {
  const artifactId = deps.generateArtifactId?.() ?? crypto.randomUUID();
  const uploadImage =
    deps.uploadImage ??
    (async (uploadInput: {
      bytes: Uint8Array;
      mimeType: string;
      fileName: string;
      folder: string;
    }) =>
      await uploadBytesToImageKit(
        uploadInput.bytes,
        uploadInput.mimeType,
        uploadInput.fileName,
        uploadInput.folder,
      ));

  let status: SaveGenerationArtifactResult["status"] = "success";
  let imageUrl: string | null = null;
  let error: string | null = null;
  let decodedImage: ReturnType<typeof getBytes> = null;
  try {
    if (input.image.kind === "url") {
      const providedUrl = input.image.url.trim();
      if (providedUrl.length === 0) {
        throw new Error("artifact_url_missing");
      }

      imageUrl = providedUrl;
      status = "partial";
    } else {
      decodedImage = getBytes(input.image);
      if (!decodedImage) {
        throw new Error("artifact_image_missing");
      }

      const uploadResult = await uploadImage({
        bytes: decodedImage.bytes,
        mimeType: decodedImage.mimeType,
        fileName: `${input.artifactType}-${artifactId}.${getFileExtension(decodedImage.mimeType)}`,
        folder: getUploadFolder(input.workflowId, input.phase),
      });

      if (!uploadResult?.url) {
        status = "failed";
        error = "imagekit_upload_failed";
      } else {
        imageUrl = uploadResult.url;
      }
    }
  } catch (err) {
    status = "failed";
    error = normalizeErrorMessage(err);
  }

  const row: GenerationArtifactRow = {
    id: artifactId,
    workflow_id: input.workflowId,
    phase: input.phase,
    artifact_type: input.artifactType,
    source_work_id: input.sourceWorkId ?? null,
    parent_artifact_id: input.parentArtifactId ?? null,
    storage_provider: input.image.kind === "url" ? "url" : "imagekit",
    image_url: imageUrl,
    image_width: null,
    image_height: null,
    mime_type:
      input.image.kind === "url" ? null : (decodedImage?.mimeType ?? null),
    file_size_bytes:
      input.image.kind === "url" ? null : (decodedImage?.fileSizeBytes ?? null),
    status,
    meta: buildRecordMeta(input.meta, error),
  };

  try {
    const insertError = await resolveRecordError(deps.recordArtifactRow(row));
    if (insertError) {
      return {
        artifactId,
        status: "failed",
        imageUrl,
        error: insertError,
      };
    }
  } catch (err) {
    return {
      artifactId,
      status: "failed",
      imageUrl,
      error: normalizeErrorMessage(err),
    };
  }

  return {
    artifactId,
    status,
    imageUrl,
    error,
  };
}
