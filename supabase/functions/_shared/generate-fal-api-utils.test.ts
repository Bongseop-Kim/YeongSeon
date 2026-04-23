import { assertEquals, assertRejects } from "jsr:@std/assert@1.0.19";
import {
  buildPlacedPreviewArtifacts,
  buildFalErrorResponseBody,
  getGenerationLogUserMessage,
  getTrustedFalImageUrl,
  inspectRemoteInpaintImage,
  parseValidatedInpaintDataUri,
  recordFinalRenderArtifacts,
  recordOptionalRenderArtifacts,
  type RecordRenderArtifactFn,
  resolveInpaintBaseImageUrl,
  shouldExecuteFalRender,
  validateRemoteInpaintBaseImageUrl,
} from "@/functions/_shared/generate-fal-api-utils.ts";

Deno.test("recordFinalRenderArtifacts keeps fal_raw before final", async () => {
  const calls: Array<{
    artifactType: string;
    parentArtifactId: string | null;
    meta: Record<string, unknown> | undefined;
    imageKind: string;
    mimeType: string | null;
    imageUrl: string | null;
  }> = [];

  const recordArtifact: RecordRenderArtifactFn = async (input) => {
    calls.push({
      artifactType: input.artifactType,
      parentArtifactId: input.parentArtifactId ?? null,
      meta: input.meta,
      imageKind: input.image.kind,
      mimeType: input.image.kind === "base64" ? input.image.mimeType : null,
      imageUrl: input.image.kind === "url" ? input.image.url : null,
    });

    return {
      artifactId: `artifact-${calls.length}`,
      status: input.artifactType === "fal_raw" ? "success" : "partial",
      imageUrl:
        input.image.kind === "url"
          ? input.image.url
          : `https://ik.test/${input.artifactType}.png`,
      error: null,
    };
  };

  await recordFinalRenderArtifacts(recordArtifact, {
    falImageUrl: "https://fal.media/raw.png",
    finalImageUrl: "https://ik.test/final.png",
    falRequestId: "fal-1",
    renderBackend: "img2img",
    rawImageBytes: new Uint8Array([1, 2, 3]),
    rawImageMimeType: "image/png",
  });

  assertEquals(
    calls.map((call) => call.artifactType),
    ["fal_raw", "final"],
  );
  assertEquals(calls[1]?.parentArtifactId, "artifact-1");
  assertEquals(calls[0]?.imageKind, "base64");
  assertEquals(calls[0]?.mimeType, "image/png");
  assertEquals(calls[0]?.meta, {
    fal_request_id: "fal-1",
    render_backend: "img2img",
    fal_image_url: "https://fal.media/raw.png",
  });
  assertEquals(calls[1]?.imageKind, "url");
  assertEquals(calls[1]?.imageUrl, "https://ik.test/final.png");
  assertEquals(calls[1]?.meta, {
    fal_request_id: "fal-1",
    render_backend: "img2img",
    generated_image_url: "https://ik.test/final.png",
  });
});

Deno.test(
  "recordFinalRenderArtifacts clears final parent when fal_raw save fails",
  async () => {
    const calls: Array<{
      artifactType: string;
      parentArtifactId: string | null;
    }> = [];

    const recordArtifact: RecordRenderArtifactFn = async (input) => {
      calls.push({
        artifactType: input.artifactType,
        parentArtifactId: input.parentArtifactId ?? null,
      });

      return {
        artifactId: `artifact-${calls.length}`,
        status: input.artifactType === "fal_raw" ? "failed" : "partial",
        imageUrl:
          input.image.kind === "url"
            ? input.image.url
            : `https://ik.test/${input.artifactType}.png`,
        error:
          input.artifactType === "fal_raw" ? "imagekit_upload_failed" : null,
      };
    };

    await recordFinalRenderArtifacts(recordArtifact, {
      falImageUrl: "https://fal.media/raw.png",
      finalImageUrl: "https://ik.test/final.png",
      falRequestId: "fal-2",
      renderBackend: "img2img",
      rawImageBytes: new Uint8Array([4, 5, 6]),
      rawImageMimeType: "image/png",
    });

    assertEquals(
      calls.map((call) => call.artifactType),
      ["fal_raw", "final"],
    );
    assertEquals(calls[1]?.parentArtifactId, null);
  },
);

Deno.test(
  "recordOptionalRenderArtifacts skips absent values and records present branches",
  async () => {
    const artifactTypes: string[] = [];

    const recordArtifact: RecordRenderArtifactFn = async (input) => {
      artifactTypes.push(input.artifactType);
      return {
        artifactId: `artifact-${artifactTypes.length}`,
        status: "success",
        imageUrl: `https://ik.test/${input.artifactType}.png`,
        error: null,
      };
    };

    await recordOptionalRenderArtifacts(recordArtifact, {
      placedPreviewBase64: "AAEC",
      placedPreviewMimeType: "image/png",
      falInputBase64: null,
      falInputMimeType: "image/png",
      upscaledReferenceBase64: "AQID",
      upscaledReferenceMimeType: "image/png",
    });

    assertEquals(artifactTypes, ["placed_preview", "upscaled_reference"]);
  },
);

Deno.test(
  "buildPlacedPreviewArtifacts uses tiled preview only for one-point placement",
  () => {
    assertEquals(
      buildPlacedPreviewArtifacts({
        ciPlacement: "one-point",
        tiledBase64: "AAEC",
        tiledMimeType: "image/png",
      }),
      {
        placedPreviewBase64: "AAEC",
        placedPreviewMimeType: "image/png",
      },
    );

    assertEquals(
      buildPlacedPreviewArtifacts({
        ciPlacement: "all-over",
        tiledBase64: "AAEC",
        tiledMimeType: "image/png",
      }),
      {
        placedPreviewBase64: null,
        placedPreviewMimeType: null,
      },
    );
  },
);

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

Deno.test("shouldExecuteFalRender blocks non-renderable analyses", () => {
  assertEquals(
    shouldExecuteFalRender(true, {
      eligibleForRender: true,
      missingRequirements: ["pattern"],
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
    const mockFetch: typeof fetch = (
      input: string | URL | Request,
      init?: RequestInit,
    ) => {
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
    };

    assertEquals(
      await inspectRemoteInpaintImage("https://assets.example.com/base.png", {
        allowedHosts: ["example.com"],
        fetchImpl: mockFetch,
      }),
      {
        url: "https://assets.example.com/base.png",
        mimeType: "image/png",
        contentLength: 1024,
      },
    );
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
            new Response(null, {
              status: 302,
              headers: {
                location: "https://169.254.169.254/latest/meta-data",
              },
            }),
        }),
      Error,
      "base_image_url_redirect_not_allowed",
    );
  },
);

Deno.test(
  "inspectRemoteInpaintImage prefers content-range total length over content-length",
  async () => {
    const response = await inspectRemoteInpaintImage(
      "https://assets.example.com/base.png",
      {
        allowedHosts: ["example.com"],
        fetchImpl: async () =>
          new Response(null, {
            status: 206,
            headers: {
              "content-type": "image/png",
              "content-length": "1",
              "content-range": "bytes 0-0/1024",
            },
          }),
      },
    );

    assertEquals(response.contentLength, 1024);
  },
);

Deno.test("inspectRemoteInpaintImage rejects zero-byte images", async () => {
  await assertRejects(
    () =>
      inspectRemoteInpaintImage("https://assets.example.com/base.png", {
        allowedHosts: ["example.com"],
        fetchImpl: async () =>
          new Response(null, {
            status: 200,
            headers: {
              "content-type": "image/png",
              "content-length": "0",
            },
          }),
      }),
    Error,
    "base_image_url_empty",
  );
});
