import { escapeCssUrl } from "@/shared/lib/css-url";

export const toPreviewBackground = (imageUrl: string): string =>
  `url("${escapeCssUrl(imageUrl)}") center/cover no-repeat`;

export const getRawImageUrlFromPreviewBackground = (
  value: string | null | undefined,
): string | null => {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  const match = trimmed.match(/^url\((['"]?)(.*?)\1\)/i);
  if (match?.[2]) {
    return match[2];
  }

  return trimmed;
};
