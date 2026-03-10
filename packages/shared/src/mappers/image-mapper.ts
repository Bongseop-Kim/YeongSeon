import type { ImageRef } from "../types/image-ref";

export interface DbImageRef {
  url: string;
  file_id: string | null;
}

export const normalizeReferenceImages = (images: ImageRef[]): ImageRef[] => {
  const normalized = new Map<string, ImageRef>();
  for (const image of images) {
    const url = (image.url ?? "").trim();
    const fileId = image.fileId?.trim() ?? "";
    if (!url) continue;

    const existing = normalized.get(url);
    if (!existing) {
      normalized.set(url, { url, fileId });
      continue;
    }

    if (!existing.fileId && fileId) {
      existing.fileId = fileId;
    }
  }
  return Array.from(normalized.values());
};

export const toDbImageRef = (image: ImageRef): DbImageRef => ({
  url: image.url,
  file_id: image.fileId?.trim() || null,
});
