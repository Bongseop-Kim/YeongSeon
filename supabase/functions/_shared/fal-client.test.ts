import { assertEquals, assertRejects } from "jsr:@std/assert@1.0.19";
import { callFalFluxImg2Img } from "./fal-client.ts";

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
