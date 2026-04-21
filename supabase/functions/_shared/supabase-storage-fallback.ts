import type { SupabaseClient } from "@supabase/supabase-js";

export async function uploadGeneratedImageToSupabaseStorage(
  adminClient: SupabaseClient,
  input: {
    bytes: Uint8Array;
    mimeType: string;
    workId: string;
  },
): Promise<{ url: string; path: string } | null> {
  const bucket = Deno.env.get("SUPABASE_STORAGE_FALLBACK_BUCKET");
  if (!bucket) {
    return null;
  }

  const extension = input.mimeType.split("/")[1] || "png";
  const path = `design-sessions/${input.workId}.${extension}`;
  const { error } = await adminClient.storage
    .from(bucket)
    .upload(path, input.bytes, {
      contentType: input.mimeType,
      upsert: true,
    });

  if (error) {
    console.error("Supabase storage fallback upload failed:", error.message);
    return null;
  }

  const { data } = adminClient.storage.from(bucket).getPublicUrl(path);
  if (!data.publicUrl) {
    return null;
  }

  return {
    url: data.publicUrl,
    path,
  };
}
