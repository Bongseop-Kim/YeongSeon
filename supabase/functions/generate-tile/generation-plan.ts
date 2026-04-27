import type { AnalysisOutput, TileGenerationRequest } from "./types.ts";
import { validateReferenceImageUrl } from "./image-generator.ts";

export function shouldReuseRepeatTile(
  analysis: AnalysisOutput,
  request: TileGenerationRequest,
): boolean {
  return (
    request.route === "tile_edit" &&
    analysis.patternType === "one_point" &&
    analysis.editTarget === "accent" &&
    analysis.accentLayout !== null &&
    request.previousRepeatTileUrl !== null &&
    request.previousRepeatTileWorkId !== null
  );
}

export function shouldFallbackToPreviousAccentLayout(
  analysis: AnalysisOutput,
  request: TileGenerationRequest,
): boolean {
  return (
    analysis.editTarget === "repeat" &&
    analysis.patternType === "one_point" &&
    analysis.accentLayout === null &&
    request.previousAccentLayoutJson !== null
  );
}

function findLatestUserImageUrl(
  messages: TileGenerationRequest["allMessages"],
): string | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role !== "user") {
      continue;
    }

    if (message.imageUrl && validateReferenceImageUrl(message.imageUrl)) {
      return message.imageUrl;
    }

    const imageAttachment = message.attachments?.find(
      (attachment) => attachment.type === "image" && attachment.value,
    );
    if (imageAttachment && validateReferenceImageUrl(imageAttachment.value)) {
      return imageAttachment.value;
    }
  }

  return null;
}

export function resolveAccentReferenceImageUrl(
  analysis: AnalysisOutput,
  request: TileGenerationRequest,
): string | null {
  if (
    analysis.patternType !== "one_point" ||
    analysis.accentLayout === null ||
    analysis.accentLayout.objectSource === "text"
  ) {
    return null;
  }

  if (
    request.attachedImageUrl &&
    validateReferenceImageUrl(request.attachedImageUrl)
  ) {
    return request.attachedImageUrl;
  }

  const latestUserImageUrl = findLatestUserImageUrl(request.allMessages);
  if (latestUserImageUrl) return latestUserImageUrl;

  if (
    request.previousAccentTileUrl &&
    validateReferenceImageUrl(request.previousAccentTileUrl)
  ) {
    return request.previousAccentTileUrl;
  }

  return null;
}
