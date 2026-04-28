import { assertEquals } from "jsr:@std/assert";
import {
  resolveAccentReferenceImageUrls,
  resolveEffectiveReferenceImageUsage,
  resolveRepeatReferenceImageUrls,
  shouldFallbackToPreviousAccentLayout,
  shouldReuseRepeatTile,
} from "./generation-plan.ts";
import type { AnalysisOutput, TileGenerationRequest } from "./types.ts";

const baseRequest: TileGenerationRequest = {
  route: "tile_edit",
  userMessage: "로고만 더 크게 바꿔줘",
  uiFabricType: "printed",
  selectedColors: [],
  previousFabricType: "printed",
  previousRepeatTileUrl: "https://ik.imagekit.io/app/repeat.webp",
  previousRepeatTileWorkId: "repeat-old",
  previousAccentTileUrl: "https://ik.imagekit.io/app/accent.webp",
  previousAccentTileWorkId: "accent-old",
  previousAccentLayoutJson: null,
  conversationHistory: [],
  attachedImageUrls: [],
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
  referenceImageUsage: "none",
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
  "resolveEffectiveReferenceImageUsage treats attached images as a single motif for new tile generation",
  () => {
    assertEquals(
      resolveEffectiveReferenceImageUsage(
        {
          ...baseAnalysis,
          patternType: "all_over",
          referenceImageUsage: "none",
        },
        {
          ...baseRequest,
          route: "tile_generation",
          attachedImageUrls: ["https://ik.imagekit.io/app/reference.png"],
        },
      ),
      "single_motif",
    );
  },
);

Deno.test(
  "resolveEffectiveReferenceImageUsage keeps none when no valid attached image exists",
  () => {
    assertEquals(
      resolveEffectiveReferenceImageUsage(
        {
          ...baseAnalysis,
          patternType: "all_over",
          referenceImageUsage: "none",
        },
        {
          ...baseRequest,
          route: "tile_generation",
          attachedImageUrls: ["data:image/png;base64,abc"],
        },
      ),
      "none",
    );
  },
);

Deno.test(
  "resolveEffectiveReferenceImageUsage preserves explicit analysis usage",
  () => {
    assertEquals(
      resolveEffectiveReferenceImageUsage(
        { ...baseAnalysis, referenceImageUsage: "multiple_motifs" },
        {
          ...baseRequest,
          route: "tile_generation",
          attachedImageUrls: ["https://ik.imagekit.io/app/reference.png"],
        },
      ),
      "multiple_motifs",
    );
  },
);

Deno.test(
  "shouldReuseRepeatTile preserves repeat for accent-only one-point edits",
  () => {
    assertEquals(shouldReuseRepeatTile(baseAnalysis, baseRequest), true);
  },
);

Deno.test(
  "resolveRepeatReferenceImageUrls uses first two images for separate motifs",
  () => {
    assertEquals(
      resolveRepeatReferenceImageUrls(
        { ...baseAnalysis, referenceImageUsage: "multiple_motifs" },
        {
          ...baseRequest,
          attachedImageUrls: [
            "https://ik.imagekit.io/app/motif-1.png",
            "https://ik.imagekit.io/app/motif-2.png",
            "https://ik.imagekit.io/app/motif-3.png",
          ],
        },
      ),
      [
        "https://ik.imagekit.io/app/motif-1.png",
        "https://ik.imagekit.io/app/motif-2.png",
      ],
    );
  },
);

Deno.test(
  "resolveRepeatReferenceImageUrls uses first image for repeat_and_accent",
  () => {
    assertEquals(
      resolveRepeatReferenceImageUrls(
        { ...baseAnalysis, referenceImageUsage: "repeat_and_accent" },
        {
          ...baseRequest,
          attachedImageUrls: [
            "https://ik.imagekit.io/app/repeat.png",
            "https://ik.imagekit.io/app/accent.png",
          ],
        },
      ),
      ["https://ik.imagekit.io/app/repeat.png"],
    );
  },
);

Deno.test(
  "resolveRepeatReferenceImageUrls falls back to latest user image for repeat_and_accent",
  () => {
    assertEquals(
      resolveRepeatReferenceImageUrls(
        { ...baseAnalysis, referenceImageUsage: "repeat_and_accent" },
        {
          ...baseRequest,
          allMessages: [
            {
              id: "msg-1",
              role: "user",
              content: "이 이미지를 반복 패턴으로",
              imageUrl: "https://ik.imagekit.io/app/latest-user.png",
              imageFileId: null,
              sequenceNumber: 0,
            },
          ],
        },
      ),
      ["https://ik.imagekit.io/app/latest-user.png"],
    );
  },
);

Deno.test(
  "resolveRepeatReferenceImageUrls falls back to previous repeat image",
  () => {
    assertEquals(
      resolveRepeatReferenceImageUrls(
        { ...baseAnalysis, referenceImageUsage: "single_motif" },
        baseRequest,
      ),
      ["https://ik.imagekit.io/app/repeat.webp"],
    );
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
  "shouldReuseRepeatTile regenerates repeat when a selected background color is present",
  () => {
    assertEquals(
      shouldReuseRepeatTile(baseAnalysis, baseRequest, "red"),
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
  "resolveAccentReferenceImageUrls prefers the newly attached image for image accents",
  () => {
    assertEquals(
      resolveAccentReferenceImageUrls(
        {
          ...baseAnalysis,
          referenceImageUsage: "single_motif",
          accentLayout: {
            objectDescription: "brand logo",
            objectSource: "image",
            color: null,
            size: null,
          },
        },
        {
          ...baseRequest,
          attachedImageUrls: ["https://ik.imagekit.io/app/new-logo.png"],
          previousAccentTileUrl: "https://ik.imagekit.io/app/old-accent.webp",
        },
      ),
      ["https://ik.imagekit.io/app/new-logo.png"],
    );
  },
);

Deno.test(
  "resolveAccentReferenceImageUrls returns all attached images for image accents",
  () => {
    assertEquals(
      resolveAccentReferenceImageUrls(
        {
          ...baseAnalysis,
          referenceImageUsage: "single_motif",
          accentLayout: {
            objectDescription: "brand logo",
            objectSource: "image",
            color: null,
            size: null,
          },
        },
        {
          ...baseRequest,
          attachedImageUrls: [
            "https://ik.imagekit.io/app/logo-1.png",
            "https://ik.imagekit.io/app/logo-2.png",
          ],
        },
      ),
      [
        "https://ik.imagekit.io/app/logo-1.png",
        "https://ik.imagekit.io/app/logo-2.png",
      ],
    );
  },
);

Deno.test(
  "resolveAccentReferenceImageUrls reuses the latest user image when no new image is attached",
  () => {
    assertEquals(
      resolveAccentReferenceImageUrls(
        {
          ...baseAnalysis,
          referenceImageUsage: "single_motif",
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
      ["https://ik.imagekit.io/app/old-logo.png"],
    );
  },
);

Deno.test(
  "resolveAccentReferenceImageUrls ignores stale non-url image attachments before reusing the previous accent tile",
  () => {
    assertEquals(
      resolveAccentReferenceImageUrls(
        {
          ...baseAnalysis,
          referenceImageUsage: "single_motif",
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
      ["https://ik.imagekit.io/app/accent.webp"],
    );
  },
);

Deno.test(
  "resolveAccentReferenceImageUrls falls back to the previous accent tile for image accents",
  () => {
    assertEquals(
      resolveAccentReferenceImageUrls(
        {
          ...baseAnalysis,
          referenceImageUsage: "single_motif",
          accentLayout: {
            objectDescription: "brand logo",
            objectSource: "image",
            color: null,
            size: null,
          },
        },
        baseRequest,
      ),
      ["https://ik.imagekit.io/app/accent.webp"],
    );
  },
);

Deno.test(
  "resolveAccentReferenceImageUrls returns no references when usage is none",
  () => {
    assertEquals(
      resolveAccentReferenceImageUrls(
        {
          ...baseAnalysis,
          referenceImageUsage: "none",
          accentLayout: {
            objectDescription: "brand logo",
            objectSource: "image",
            color: null,
            size: null,
          },
        },
        {
          ...baseRequest,
          attachedImageUrls: ["https://ik.imagekit.io/app/logo.png"],
        },
      ),
      [],
    );
  },
);

Deno.test(
  "resolveAccentReferenceImageUrls skips references for text accents",
  () => {
    assertEquals(
      resolveAccentReferenceImageUrls(baseAnalysis, {
        ...baseRequest,
        attachedImageUrls: ["https://ik.imagekit.io/app/logo.png"],
      }),
      [],
    );
  },
);
