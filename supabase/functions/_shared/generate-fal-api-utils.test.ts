import { assertEquals } from "jsr:@std/assert@1.0.19";
import {
  buildFalErrorResponseBody,
  getTrustedFalImageUrl,
  resolveInpaintBaseImageUrl,
} from "@/functions/_shared/generate-fal-api-utils.ts";

Deno.test("getTrustedFalImageUrl accepts fal.media subdomains", () => {
  assertEquals(
    getTrustedFalImageUrl("https://v3.fal.media/image.png"),
    "https://v3.fal.media/image.png",
  );
});

Deno.test("getTrustedFalImageUrl rejects non-fal hosts", () => {
  assertEquals(
    getTrustedFalImageUrl("https://evil.example.com/image.png"),
    null,
  );
});

Deno.test(
  "buildFalErrorResponseBody preserves analysis response fields",
  () => {
    assertEquals(
      buildFalErrorResponseBody("fal_render_failed", {
        aiMessage: "analysis complete",
        workflowId: "workflow-1",
        analysisWorkId: "analysis-1",
        generateImage: true,
      }),
      {
        error: "fal_render_failed",
        aiMessage: "analysis complete",
        workflowId: "workflow-1",
        analysisWorkId: "analysis-1",
        generateImage: true,
      },
    );
  },
);

Deno.test("resolveInpaintBaseImageUrl reuses remote URL inputs", () => {
  assertEquals(
    resolveInpaintBaseImageUrl({
      baseImageUrl: "https://example.com/base.png",
    }),
    "https://example.com/base.png",
  );
});

Deno.test(
  "resolveInpaintBaseImageUrl skips URL when base64 is provided",
  () => {
    assertEquals(
      resolveInpaintBaseImageUrl({
        baseImageUrl: "https://example.com/base.png",
        baseImageBase64: "abc",
        baseImageMimeType: "image/png",
      }),
      undefined,
    );
  },
);
