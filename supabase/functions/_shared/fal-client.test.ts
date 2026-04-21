import { assertEquals, assertRejects } from "jsr:@std/assert@1.0.19";
import {
  callFalClarityUpscaler,
  callFalFluxFill,
  callFalFluxImg2Img,
  callFalFluxIpAdapter,
} from "@/functions/_shared/fal-client.ts";

Deno.test(
  "callFalFluxImg2Img rejects an untrusted fal status url",
  async () => {
    const originalFetch = globalThis.fetch;

    globalThis.fetch = ((input: string | URL | Request) => {
      if (
        String(input) === "https://queue.fal.run/fal-ai/flux/dev/image-to-image"
      ) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              request_id: "req-1",
              status_url: "https://evil.example.com/status",
              response_url: "https://queue.fal.run/result",
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        );
      }

      throw new Error(`unexpected fetch: ${String(input)}`);
    }) as typeof fetch;

    try {
      await assertRejects(
        () =>
          callFalFluxImg2Img({
            imageBase64: "abc",
            imageMimeType: "image/png",
            prompt: "test",
            apiKey: "secret",
            timeoutMs: 1000,
          }),
        Error,
        "Unexpected Fal queue URL",
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  },
);

Deno.test(
  "callFalFluxImg2Img keeps authorization on trusted fal queue urls",
  async () => {
    const originalFetch = globalThis.fetch;
    const requests: Array<{ url: string; authorization: string | null }> = [];

    globalThis.fetch = ((input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      requests.push({
        url,
        authorization:
          init?.headers instanceof Headers
            ? init.headers.get("Authorization")
            : ((init?.headers as Record<string, string> | undefined)
                ?.Authorization ?? null),
      });

      if (url === "https://queue.fal.run/fal-ai/flux/dev/image-to-image") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              request_id: "req-1",
              status_url: "https://queue.fal.run/requests/req-1/status",
              response_url: "https://queue.fal.run/requests/req-1",
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        );
      }

      if (url === "https://queue.fal.run/requests/req-1/status") {
        return Promise.resolve(
          new Response(JSON.stringify({ status: "COMPLETED" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        );
      }

      if (url === "https://queue.fal.run/requests/req-1") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              images: [{ url: "https://fal.media/image.png" }],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        );
      }

      throw new Error(`unexpected fetch: ${url}`);
    }) as typeof fetch;

    try {
      const result = await callFalFluxImg2Img({
        imageBase64: "abc",
        imageMimeType: "image/png",
        prompt: "test",
        apiKey: "secret",
        timeoutMs: 1000,
      });

      assertEquals(result.imageUrl, "https://fal.media/image.png");
      assertEquals(
        requests.find((request) =>
          request.url.endsWith("/requests/req-1/status"),
        )?.authorization,
        "Key secret",
      );
      assertEquals(
        requests.find((request) => request.url.endsWith("/requests/req-1"))
          ?.authorization,
        "Key secret",
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  },
);

Deno.test("callFalClarityUpscaler returns upscaled image url", async () => {
  const originalFetch = globalThis.fetch;
  let submitBody: Record<string, unknown> | null = null;

  globalThis.fetch = (async (
    input: string | URL | Request,
    init?: RequestInit,
  ) => {
    const url = String(input);

    if (url === "https://queue.fal.run/fal-ai/clarity-upscaler") {
      submitBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
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
        JSON.stringify({ images: [{ url: "https://fal.media/upscaled.png" }] }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    throw new Error(`unexpected fetch: ${url}`);
  }) as typeof fetch;

  try {
    const result = await callFalClarityUpscaler({
      imageBase64: "abc",
      imageMimeType: "image/png",
      apiKey: "secret",
    });

    assertEquals(result.imageUrl, "https://fal.media/upscaled.png");
    assertEquals(result.requestId, "req-upscale");
    if (submitBody === null) {
      throw new Error("submitBody was not captured");
    }
    const capturedBody = submitBody as Record<string, unknown>;
    assertEquals(capturedBody["scale"], 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("callFalFluxIpAdapter passes style image and weight", async () => {
  const originalFetch = globalThis.fetch;
  let submitBody: Record<string, unknown> | null = null;

  globalThis.fetch = (async (
    input: string | URL | Request,
    init?: RequestInit,
  ) => {
    const url = String(input);

    if (url === "https://queue.fal.run/fal-ai/flux-general/image-to-image") {
      submitBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return new Response(
        JSON.stringify({
          request_id: "req-ip",
          status_url: "https://queue.fal.run/requests/req-ip/status",
          response_url: "https://queue.fal.run/requests/req-ip",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    if (url === "https://queue.fal.run/requests/req-ip/status") {
      return new Response(JSON.stringify({ status: "COMPLETED" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url === "https://queue.fal.run/requests/req-ip") {
      return new Response(
        JSON.stringify({ images: [{ url: "https://fal.media/ip.png" }] }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    throw new Error(`unexpected fetch: ${url}`);
  }) as typeof fetch;

  try {
    const result = await callFalFluxIpAdapter({
      referenceBase64: "abc",
      referenceMimeType: "image/png",
      prompt: "ip-adapter prompt",
      weight: 0.7,
      apiKey: "secret",
    });

    assertEquals(result.imageUrl, "https://fal.media/ip.png");
    assertEquals(result.requestId, "req-ip");
    if (submitBody === null) {
      throw new Error("submitBody was not captured");
    }
    const capturedBody = submitBody as Record<string, unknown>;
    assertEquals(capturedBody["image_url"], "data:image/png;base64,abc");
    assertEquals(capturedBody["ip_adapters"], [
      {
        path: "h94/IP-Adapter",
        image_encoder_path: "openai/clip-vit-large-patch14",
        image_url: "data:image/png;base64,abc",
        scale: 0.7,
      },
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("callFalFluxFill passes mask payload", async () => {
  const originalFetch = globalThis.fetch;
  let submitBody: Record<string, unknown> | null = null;

  globalThis.fetch = (async (
    input: string | URL | Request,
    init?: RequestInit,
  ) => {
    const url = String(input);

    if (url === "https://queue.fal.run/fal-ai/flux-pro/v1/fill") {
      submitBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return new Response(
        JSON.stringify({
          request_id: "req-fill",
          status_url: "https://queue.fal.run/requests/req-fill/status",
          response_url: "https://queue.fal.run/requests/req-fill",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    if (url === "https://queue.fal.run/requests/req-fill/status") {
      return new Response(JSON.stringify({ status: "COMPLETED" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url === "https://queue.fal.run/requests/req-fill") {
      return new Response(
        JSON.stringify({ images: [{ url: "https://fal.media/fill.png" }] }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    throw new Error(`unexpected fetch: ${url}`);
  }) as typeof fetch;

  try {
    const result = await callFalFluxFill({
      imageBase64: "image",
      imageMimeType: "image/png",
      maskBase64: "mask",
      maskMimeType: "image/png",
      prompt: "prompt",
      apiKey: "secret",
    });

    assertEquals(result.imageUrl, "https://fal.media/fill.png");
    assertEquals(result.requestId, "req-fill");
    if (submitBody === null) {
      throw new Error("submitBody was not captured");
    }
    const capturedBody = submitBody as Record<string, unknown>;
    assertEquals(capturedBody["image_url"], "data:image/png;base64,image");
    assertEquals(capturedBody["mask_url"], "data:image/png;base64,mask");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
