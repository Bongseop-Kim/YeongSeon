import { supabase } from "@/shared/lib/supabase";

export type AssetKind = "ci" | "reference" | "mask" | "base";

export interface UploadResult {
  signedUrl: string;
  storagePath: string;
  hash: string;
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

  return "bin";
}

async function hashBlob(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let hash = 0x811c9dc5;

  for (let index = 0; index < bytes.length; index += 1) {
    hash ^= bytes[index] ?? 0;
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
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

  const path = `${user.id}/${ymd()}/${options.kind}-${crypto.randomUUID()}.${extOf(blob.type)}`;
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
    throw signError ?? new Error("sign-failed");
  }

  return {
    signedUrl: signed.signedUrl,
    storagePath: uploaded.path,
    hash: await hashBlob(blob),
  };
}
