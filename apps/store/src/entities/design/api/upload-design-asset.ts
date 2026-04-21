import { supabase } from "@/shared/lib/supabase";

type AssetKind = "ci" | "reference" | "mask" | "base";

interface UploadResult {
  signedUrl: string;
  storagePath: string;
  hash: string;
}

class UnsupportedMimeTypeError extends Error {
  readonly status = 415;

  constructor(mime: string) {
    super(`Unsupported MIME type: ${mime}`);
    this.name = "UnsupportedMimeTypeError";
  }
}

const BUCKET = "design-assets";
const SIGNED_URL_TTL_SECONDS = 600;

function ymd(): string {
  const date = new Date();
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

function extOf(mime: string): string {
  if (mime === "image/png") {
    return "png";
  }

  if (mime === "image/jpeg") {
    return "jpg";
  }

  if (mime === "image/webp") {
    return "webp";
  }

  throw new UnsupportedMimeTypeError(mime);
}

async function hashBlob(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", arrayBuffer);
  const bytes = new Uint8Array(digest);

  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

export async function uploadDesignAsset(
  blob: Blob,
  options: { kind: AssetKind },
): Promise<UploadResult> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) {
    throw userError;
  }

  const user = userData?.user;
  if (!user) {
    throw new Error("unauthenticated");
  }

  const hash = await hashBlob(blob);
  const extension = extOf(blob.type);
  const path = `${user.id}/${ymd()}/${options.kind}-${crypto.randomUUID()}.${extension}`;
  const { data: uploaded, error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, {
      contentType: blob.type,
      upsert: false,
    });

  if (uploadError || !uploaded) {
    throw uploadError ?? new Error("upload-failed");
  }

  const { data: signed, error: signError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(uploaded.path, SIGNED_URL_TTL_SECONDS);

  if (signError || !signed) {
    const cleanupError =
      (await supabase.storage.from(BUCKET).remove([uploaded.path])).error ??
      null;

    if (cleanupError) {
      throw new Error(
        `${signError?.message ?? "sign-failed"}; cleanup failed: ${cleanupError.message}`,
        {
          cause: signError ?? cleanupError,
        },
      );
    }

    throw signError ?? new Error("sign-failed");
  }

  return {
    signedUrl: signed.signedUrl,
    storagePath: uploaded.path,
    hash,
  };
}
