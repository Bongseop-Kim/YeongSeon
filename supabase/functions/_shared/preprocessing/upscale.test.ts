import { assertEquals } from "jsr:@std/assert@1.0.19";
import {
  maybeUpscaleReference,
  needsUpscale,
} from "@/functions/_shared/preprocessing/upscale.ts";

Deno.test("needsUpscale returns true when min dimension < 512", () => {
  assertEquals(needsUpscale({ width: 400, height: 800 }), true);
  assertEquals(needsUpscale({ width: 800, height: 400 }), true);
});

Deno.test("needsUpscale returns false when both dimensions >= 512", () => {
  assertEquals(needsUpscale({ width: 512, height: 512 }), false);
  assertEquals(needsUpscale({ width: 1024, height: 768 }), false);
});

Deno.test("needsUpscale keeps the 512px boundary strict on both axes", () => {
  assertEquals(needsUpscale({ width: 511, height: 512 }), true);
  assertEquals(needsUpscale({ width: 512, height: 511 }), true);
  assertEquals(needsUpscale({ width: 512, height: 512 }), false);
});

Deno.test("needsUpscale returns true for degenerate tiny inputs", () => {
  assertEquals(needsUpscale({ width: 0, height: 0 }), true);
});

Deno.test(
  "maybeUpscaleReference rejects non-image downloads from the upscaler",
  async () => {
    const originalFetch = globalThis.fetch;

    globalThis.fetch = (async (input: string | URL | Request) => {
      const url = String(input);

      if (url === "https://queue.fal.run/fal-ai/clarity-upscaler") {
        return new Response(
          JSON.stringify({
            request_id: "req-upscale",
            status_url: "https://queue.fal.run/requests/req-upscale/status",
            response_url: "https://queue.fal.run/requests/req-upscale",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url === "https://queue.fal.run/requests/req-upscale/status") {
        return new Response(JSON.stringify({ status: "COMPLETED" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url === "https://queue.fal.run/requests/req-upscale") {
        return new Response(
          JSON.stringify({
            images: [{ url: "https://fal.media/upscaled.png" }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url === "https://fal.media/upscaled.png") {
        return new Response("<html>not-image</html>", {
          status: 200,
          headers: { "Content-Type": "text/html" },
        });
      }

      throw new Error(`unexpected fetch: ${url}`);
    }) as typeof fetch;

    try {
      await maybeUpscaleReference({
        base64:
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aW3QAAAAASUVORK5CYII=",
        mimeType: "image/png",
        apiKey: "secret",
      }).then(
        () => {
          throw new Error("expected maybeUpscaleReference to reject");
        },
        (error: unknown) => {
          assertEquals(
            error instanceof Error &&
              error.message.includes("text/html") &&
              error.message.includes("https://fal.media/upscaled.png"),
            true,
          );
        },
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  },
);
