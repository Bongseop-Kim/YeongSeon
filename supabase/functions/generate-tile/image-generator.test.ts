import { assertEquals, assertRejects } from "jsr:@std/assert@1.0.19";
import {
  fetchReferenceImage,
  referenceFileName,
  validateReferenceImageUrl,
} from "./image-generator.ts";

const REFERENCE_URL = "https://ik.imagekit.io/app/ref.png";

const withMockedFetch = async (
  fetchImpl: typeof fetch,
  body: () => Promise<void>,
) => {
  const original = globalThis.fetch;
  globalThis.fetch = fetchImpl;
  try {
    await body();
  } finally {
    globalThis.fetch = original;
  }
};

Deno.test("validateReferenceImageUrl accepts HTTPS ImageKit URLs", () => {
  assertEquals(
    validateReferenceImageUrl("https://ik.imagekit.io/app/logo.png"),
    "https://ik.imagekit.io/app/logo.png",
  );
});

Deno.test(
  "validateReferenceImageUrl accepts configured HTTPS image host",
  () => {
    assertEquals(
      validateReferenceImageUrl("https://cdn.example.com/logo.png", [
        "cdn.example.com",
      ]),
      "https://cdn.example.com/logo.png",
    );
  },
);

Deno.test("validateReferenceImageUrl rejects non-HTTPS URLs", () => {
  assertEquals(
    validateReferenceImageUrl("http://ik.imagekit.io/app/logo.png"),
    null,
  );
});

Deno.test("validateReferenceImageUrl rejects internal metadata URLs", () => {
  assertEquals(
    validateReferenceImageUrl("http://169.254.169.254/latest"),
    null,
  );
});

Deno.test(
  "validateReferenceImageUrl rejects HTTPS internal metadata URLs",
  () => {
    assertEquals(
      validateReferenceImageUrl("https://169.254.169.254/latest"),
      null,
    );
  },
);

Deno.test("validateReferenceImageUrl rejects untrusted HTTPS hosts", () => {
  assertEquals(validateReferenceImageUrl("https://example.com/logo.png"), null);
});

Deno.test(
  "fetchReferenceImage rejects when content-length exceeds the cap",
  async () => {
    await withMockedFetch(
      () =>
        Promise.resolve(
          new Response(new Uint8Array(8), {
            status: 200,
            headers: {
              "content-type": "image/png",
              "content-length": String(8 * 1024 * 1024 + 1),
            },
          }),
        ),
      async () => {
        await assertRejects(
          () => fetchReferenceImage(REFERENCE_URL),
          Error,
          "Reference image exceeds maximum size",
        );
      },
    );
  },
);

Deno.test(
  "fetchReferenceImage cancels and rejects when streamed bytes exceed the cap",
  async () => {
    let cancelled = false;
    const oversized = new Uint8Array(8 * 1024 * 1024 + 1);
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.enqueue(oversized);
      },
      cancel() {
        cancelled = true;
      },
    });

    await withMockedFetch(
      () =>
        Promise.resolve(
          new Response(stream, {
            status: 200,
            headers: { "content-type": "image/png" },
          }),
        ),
      async () => {
        await assertRejects(
          () => fetchReferenceImage(REFERENCE_URL),
          Error,
          "Reference image exceeds maximum size",
        );
      },
    );

    assertEquals(cancelled, true);
  },
);

Deno.test(
  "fetchReferenceImage rejects after the configured timeout",
  async () => {
    await withMockedFetch(
      (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
          });
        }),
      async () => {
        await assertRejects(
          () => fetchReferenceImage(REFERENCE_URL),
          Error,
          "Reference image fetch timed out after",
        );
      },
    );
  },
);

Deno.test("fetchReferenceImage rejects when response is not ok", async () => {
  await withMockedFetch(
    () => Promise.resolve(new Response("not found", { status: 404 })),
    async () => {
      await assertRejects(
        () => fetchReferenceImage(REFERENCE_URL),
        Error,
        "Reference image fetch failed",
      );
    },
  );
});

Deno.test("referenceFileName maps allowed MIME types to extensions", () => {
  assertEquals(
    referenceFileName(new Blob([], { type: "image/png" })),
    "reference.png",
  );
  assertEquals(
    referenceFileName(new Blob([], { type: "image/jpeg" })),
    "reference.jpg",
  );
  assertEquals(
    referenceFileName(new Blob([], { type: "image/jpg" })),
    "reference.jpg",
  );
  assertEquals(
    referenceFileName(new Blob([], { type: "image/webp; charset=binary" })),
    "reference.webp",
  );
});

Deno.test("referenceFileName rejects unsupported MIME types", () => {
  let captured: unknown = null;
  try {
    referenceFileName(new Blob([], { type: "image/gif" }));
  } catch (error) {
    captured = error;
  }
  assertEquals(captured instanceof Error, true);
  assertEquals(
    (captured as Error).message,
    "Unsupported reference image MIME type: image/gif",
  );
});
