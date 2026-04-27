import { escapeCssUrl, unescapeCssUrl } from "@/shared/lib/css-url";

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

  const match = trimmed.match(
    /^url\(\s*(?:"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'|([^)]*?))\s*\)/i,
  );
  const captured = match?.[1] ?? match?.[2] ?? match?.[3];
  if (captured) {
    return unescapeCssUrl(captured);
  }

  return trimmed;
};
