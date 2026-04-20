import { assertEquals } from "jsr:@std/assert@1.0.19";
import {
  buildFalErrorResponseBody,
  getTrustedFalImageUrl,
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
