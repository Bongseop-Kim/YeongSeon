import { assertEquals } from "jsr:@std/assert";
import {
  resolveAccentReferenceImageUrl,
  shouldFallbackToPreviousAccentLayout,
  shouldReuseRepeatTile,
} from "./generation-plan.ts";
import type { AnalysisOutput, TileGenerationRequest } from "./types.ts";

const baseRequest: TileGenerationRequest = {
  route: "tile_edit",
  userMessage: "로고만 더 크게 바꿔줘",
  uiFabricType: "printed",
  previousFabricType: "printed",
  previousRepeatTileUrl: "https://ik.imagekit.io/app/repeat.webp",
  previousRepeatTileWorkId: "repeat-old",
  previousAccentTileUrl: "https://ik.imagekit.io/app/accent.webp",
  previousAccentTileWorkId: "accent-old",
  previousAccentLayoutJson: null,
  conversationHistory: [],
  attachedImageUrl: null,
  sessionId: "session-1",
  workflowId: "workflow-1",
  firstMessage: "처음 요청",
  allMessages: [],
};

const baseAnalysis: AnalysisOutput = {
  intent: "edit",
  patternType: "one_point",
  editTarget: "accent",
  fabricTypeHint: null,
  tileLayout: {
    structure: "F",
    variation: null,
    motifs: [{ name: "stripe", color: null, colors: null }],
    backgroundColor: "navy",
  },
  accentLayout: {
    objectDescription: "brand logo",
    objectSource: "text",
    color: null,
    size: null,
  },
};

Deno.test(
  "shouldReuseRepeatTile preserves repeat for accent-only one-point edits",
  () => {
    assertEquals(shouldReuseRepeatTile(baseAnalysis, baseRequest), true);
  },
);

Deno.test(
  "shouldReuseRepeatTile regenerates repeat when edit target is both",
  () => {
    assertEquals(
      shouldReuseRepeatTile(
        { ...baseAnalysis, editTarget: "both" },
        baseRequest,
      ),
      false,
    );
  },
);

Deno.test(
  "shouldReuseRepeatTile regenerates repeat when previous repeat URL is missing",
  () => {
    assertEquals(
      shouldReuseRepeatTile(baseAnalysis, {
        ...baseRequest,
        previousRepeatTileUrl: null,
      }),
      false,
    );
  },
);

Deno.test(
  "shouldFallbackToPreviousAccentLayout uses stored layout when repeat is edited and LLM returned no accentLayout",
  () => {
    assertEquals(
      shouldFallbackToPreviousAccentLayout(
        {
          ...baseAnalysis,
          editTarget: "repeat",
          accentLayout: null,
        },
        {
          ...baseRequest,
          previousAccentLayoutJson: {
            objectDescription: "brand logo",
            objectSource: "text",
            color: null,
            size: null,
          },
        },
      ),
      true,
    );
  },
);

Deno.test(
  "shouldFallbackToPreviousAccentLayout skips when previousAccentLayoutJson is null",
  () => {
    assertEquals(
      shouldFallbackToPreviousAccentLayout(
        { ...baseAnalysis, editTarget: "repeat", accentLayout: null },
        { ...baseRequest, previousAccentLayoutJson: null },
      ),
      false,
    );
  },
);

Deno.test(
  "shouldFallbackToPreviousAccentLayout skips when LLM already returned accentLayout",
  () => {
    assertEquals(
      shouldFallbackToPreviousAccentLayout(
        { ...baseAnalysis, editTarget: "repeat" },
        {
          ...baseRequest,
          previousAccentLayoutJson: {
            objectDescription: "brand logo",
            objectSource: "text",
            color: null,
            size: null,
          },
        },
      ),
      false,
    );
  },
);

Deno.test(
  "resolveAccentReferenceImageUrl prefers the newly attached image for image accents",
  () => {
    assertEquals(
      resolveAccentReferenceImageUrl(
        {
          ...baseAnalysis,
          accentLayout: {
            objectDescription: "brand logo",
            objectSource: "image",
            color: null,
            size: null,
          },
        },
        {
          ...baseRequest,
          attachedImageUrl: "https://ik.imagekit.io/app/new-logo.png",
          previousAccentTileUrl: "https://ik.imagekit.io/app/old-accent.webp",
        },
      ),
      "https://ik.imagekit.io/app/new-logo.png",
    );
  },
);

Deno.test(
  "resolveAccentReferenceImageUrl reuses the latest user image when no new image is attached",
  () => {
    assertEquals(
      resolveAccentReferenceImageUrl(
        {
          ...baseAnalysis,
          accentLayout: {
            objectDescription: "brand logo",
            objectSource: "both",
            color: null,
            size: null,
          },
        },
        {
          ...baseRequest,
          allMessages: [
            {
              id: "msg-1",
              role: "user",
              content: "이 로고로",
              imageUrl: null,
              imageFileId: null,
              attachments: [
                {
                  type: "image",
                  label: "old logo",
                  value: "https://ik.imagekit.io/app/old-logo.png",
                },
              ],
              sequenceNumber: 0,
            },
            {
              id: "msg-2",
              role: "user",
              content: "색만 바꿔줘",
              imageUrl: null,
              imageFileId: null,
              sequenceNumber: 1,
            },
          ],
        },
      ),
      "https://ik.imagekit.io/app/old-logo.png",
    );
  },
);

Deno.test(
  "resolveAccentReferenceImageUrl ignores stale non-url image attachments before reusing the previous accent tile",
  () => {
    assertEquals(
      resolveAccentReferenceImageUrl(
        {
          ...baseAnalysis,
          accentLayout: {
            objectDescription: "brand logo",
            objectSource: "image",
            color: null,
            size: null,
          },
        },
        {
          ...baseRequest,
          allMessages: [
            {
              id: "msg-1",
              role: "user",
              content: "이 로고로",
              imageUrl: null,
              imageFileId: null,
              attachments: [
                {
                  type: "image",
                  label: "이미지 첨부",
                  value: "source",
                },
              ],
              sequenceNumber: 0,
            },
            {
              id: "msg-2",
              role: "user",
              content: "색만 바꿔줘",
              imageUrl: null,
              imageFileId: null,
              sequenceNumber: 1,
            },
          ],
          previousAccentTileUrl: "https://ik.imagekit.io/app/accent.webp",
        },
      ),
      "https://ik.imagekit.io/app/accent.webp",
    );
  },
);

Deno.test(
  "resolveAccentReferenceImageUrl falls back to the previous accent tile for image accents",
  () => {
    assertEquals(
      resolveAccentReferenceImageUrl(
        {
          ...baseAnalysis,
          accentLayout: {
            objectDescription: "brand logo",
            objectSource: "image",
            color: null,
            size: null,
          },
        },
        baseRequest,
      ),
      "https://ik.imagekit.io/app/accent.webp",
    );
  },
);

Deno.test(
  "resolveAccentReferenceImageUrl skips references for text accents",
  () => {
    assertEquals(
      resolveAccentReferenceImageUrl(baseAnalysis, {
        ...baseRequest,
        attachedImageUrl: "https://ik.imagekit.io/app/logo.png",
      }),
      null,
    );
  },
);
