import { assertEquals, assertRejects } from "jsr:@std/assert@1.0.19";
import {
  buildFalErrorResponseBody,
  getGenerationLogUserMessage,
  getTrustedFalImageUrl,
  inspectRemoteInpaintImage,
  parseValidatedInpaintDataUri,
  resolveInpaintBaseImageUrl,
  shouldExecuteFalRender,
  validateRemoteInpaintBaseImageUrl,
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

Deno.test(
  "resolveInpaintBaseImageUrl keeps the URL when base64 and mime are whitespace only",
  () => {
    assertEquals(
      resolveInpaintBaseImageUrl({
        baseImageUrl: " https://example.com/base.png ",
        baseImageBase64: "   ",
        baseImageMimeType: "   ",
      }),
      "https://example.com/base.png",
    );
  },
);

Deno.test(
  "getGenerationLogUserMessage prefers the analysis snapshot message",
  () => {
    assertEquals(
      getGenerationLogUserMessage({
        payloadUserMessage: undefined,
        analysisUserMessage: "analysis prompt",
      }),
      {
        userMessage: "analysis prompt",
        promptLength: "analysis prompt".length,
      },
    );
  },
);

Deno.test("shouldExecuteFalRender blocks analysis_only requests", () => {
  assertEquals(
    shouldExecuteFalRender("analysis_only", true, {
      eligibleForRender: true,
      missingRequirements: [],
    }),
    false,
  );
});

Deno.test("validateRemoteInpaintBaseImageUrl rejects blocked hosts", () => {
  assertEquals(
    validateRemoteInpaintBaseImageUrl(
      "https://169.254.169.254/latest/meta-data",
      ["example.com"],
    ),
    null,
  );
});

Deno.test("validateRemoteInpaintBaseImageUrl accepts allowlisted hosts", () => {
  assertEquals(
    validateRemoteInpaintBaseImageUrl(" https://assets.example.com/base.png ", [
      "example.com",
    ]),
    "https://assets.example.com/base.png",
  );
});

Deno.test("parseValidatedInpaintDataUri rejects disallowed mime types", () => {
  assertEquals(
    parseValidatedInpaintDataUri("data:text/plain;base64,abcd"),
    null,
  );
});

Deno.test(
  "inspectRemoteInpaintImage validates remote image metadata",
  async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = ((input: string | URL | Request, init?: RequestInit) => {
      if (
        String(input) === "https://assets.example.com/base.png" &&
        init?.method === "HEAD"
      ) {
        return Promise.resolve(
          new Response(null, {
            status: 200,
            headers: {
              "content-type": "image/png; charset=utf-8",
              "content-length": "1024",
            },
          }),
        );
      }

      throw new Error(`unexpected fetch: ${String(input)}`);
    }) as typeof fetch;

    try {
      assertEquals(
        await inspectRemoteInpaintImage("https://assets.example.com/base.png", {
          allowedHosts: ["example.com"],
        }),
        {
          url: "https://assets.example.com/base.png",
          mimeType: "image/png",
          contentLength: 1024,
        },
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  },
);

Deno.test(
  "inspectRemoteInpaintImage rejects redirects that leave the allowlist",
  async () => {
    await assertRejects(
      () =>
        inspectRemoteInpaintImage("https://assets.example.com/base.png", {
          allowedHosts: ["example.com"],
          fetchImpl: async () =>
            ({
              ok: true,
              status: 200,
              url: "https://169.254.169.254/latest/meta-data",
              headers: new Headers({
                "content-type": "image/png",
                "content-length": "1024",
              }),
              body: null,
            }) as Response,
        }),
      Error,
    );
  },
);
