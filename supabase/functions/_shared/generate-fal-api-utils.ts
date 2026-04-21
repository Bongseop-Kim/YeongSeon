const TRUSTED_FAL_IMAGE_BASE_HOST = "fal.media";

export const getTrustedFalImageUrl = (value: string): string | null => {
  try {
    const parsedUrl = new URL(value);
    const host = parsedUrl.hostname;
    const isTrustedHost =
      host === TRUSTED_FAL_IMAGE_BASE_HOST ||
      host.endsWith(`.${TRUSTED_FAL_IMAGE_BASE_HOST}`);

    if (parsedUrl.protocol !== "https:" || !isTrustedHost) {
      return null;
    }

    return parsedUrl.toString();
  } catch {
    return null;
  }
};

export const buildFalErrorResponseBody = <T extends Record<string, unknown>>(
  error: string,
  analysisResponseBody: T,
): T & { error: string } => ({
  error,
  ...analysisResponseBody,
});

export const resolveInpaintBaseImageUrl = (input: {
  baseImageUrl?: string | null;
  baseImageBase64?: string;
  baseImageMimeType?: string;
}): string | undefined => {
  if (input.baseImageBase64 && input.baseImageMimeType) {
    return undefined;
  }

  const baseImageUrl = input.baseImageUrl?.trim();
  return baseImageUrl ? baseImageUrl : undefined;
};
