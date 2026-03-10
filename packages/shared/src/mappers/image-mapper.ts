import type { ImageRef } from "../types/image-ref";

export interface DbImageRef {
  url: string;
  file_id: string | null;
}

export const normalizeReferenceImages = (images: ImageRef[]): ImageRef[] => {
  const seen = new Set<string>();
  const normalized: ImageRef[] = [];
  for (const image of images) {
    const url = (image.url ?? "").trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    normalized.push({ url, fileId: image.fileId ? image.fileId.trim() : "" });
  }
  return normalized;
};

export const toDbImageRef = (image: ImageRef): DbImageRef => ({
  url: image.url,
  file_id: image.fileId,
});
