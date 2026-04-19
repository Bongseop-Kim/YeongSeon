import {
  ALLOWED_TILED_MIME_TYPES,
  shouldProceedToFalRender,
  validateFalGeneratePayload,
} from "./fal-request-validation.ts";

const assertEquals = <T>(actual: T, expected: T) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`,
    );
  }
};

const assertObjectMatch = (
  actual: Record<string, unknown>,
  expected: Record<string, unknown>,
) => {
  const entries = Object.entries(expected);
  for (const [key, value] of entries) {
    const actualValue = actual[key];
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      actualValue &&
      typeof actualValue === "object" &&
      !Array.isArray(actualValue)
    ) {
      assertObjectMatch(
        actualValue as Record<string, unknown>,
        value as Record<string, unknown>,
      );
      continue;
    }

    if (JSON.stringify(actualValue) !== JSON.stringify(value)) {
      throw new Error(
        `Expected ${key} to match ${JSON.stringify(value)}, received ${JSON.stringify(actualValue)}`,
      );
    }
  }
};

Deno.test(
  "validateFalGeneratePayload rejects non-array conversationHistory",
  () => {
    const result = validateFalGeneratePayload({
      userMessage: "스트라이프로 바꿔줘",
      designContext: {
        colors: ["navy"],
        fabricMethod: "yarn-dyed",
        ciPlacement: "all-over",
      },
      tiledBase64: "abc",
      tiledMimeType: "image/png",
      conversationHistory: "invalid",
    } as unknown as Parameters<typeof validateFalGeneratePayload>[0]);

    assertObjectMatch(result, {
      ok: false,
      status: 400,
      body: { error: "conversationHistory must be an array" },
    });
  },
);

Deno.test(
  "validateFalGeneratePayload rejects oversized conversationHistory",
  () => {
    const result = validateFalGeneratePayload({
      userMessage: "스트라이프로 바꿔줘",
      designContext: {
        colors: ["navy"],
        fabricMethod: "yarn-dyed",
        ciPlacement: "all-over",
      },
      tiledBase64: "abc",
      tiledMimeType: "image/png",
      conversationHistory: Array.from({ length: 21 }, () => ({
        role: "user",
        content: "hello",
      })),
    });

    assertObjectMatch(result, {
      ok: false,
      status: 400,
      body: { error: "conversationHistory too long" },
    });
  },
);

Deno.test(
  "validateFalGeneratePayload rejects conversationHistory without valid turns",
  () => {
    const result = validateFalGeneratePayload({
      userMessage: "스트라이프로 바꿔줘",
      designContext: {
        colors: ["navy"],
        fabricMethod: "yarn-dyed",
        ciPlacement: "all-over",
      },
      tiledBase64: "abc",
      tiledMimeType: "image/png",
      conversationHistory: [{ role: "invalid", content: "" }],
    } as unknown as Parameters<typeof validateFalGeneratePayload>[0]);

    assertObjectMatch(result, {
      ok: false,
      status: 400,
      body: { error: "no valid conversationHistory turns" },
    });
  },
);

Deno.test(
  "validateFalGeneratePayload rejects invalid tiled image metadata",
  () => {
    const basePayload = {
      userMessage: "스트라이프로 바꿔줘",
      designContext: {
        colors: ["navy"],
        fabricMethod: "yarn-dyed",
        ciPlacement: "all-over",
      },
    };

    assertObjectMatch(
      validateFalGeneratePayload({
        ...basePayload,
        tiledBase64: "",
        tiledMimeType: "image/png",
      }),
      {
        ok: false,
        status: 400,
        body: { error: "tiledBase64 must be a non-empty string" },
      },
    );

    assertObjectMatch(
      validateFalGeneratePayload({
        ...basePayload,
        tiledBase64: "abc",
        tiledMimeType: "text/plain",
      }),
      {
        ok: false,
        status: 400,
        body: {
          error: `tiledMimeType must be one of: ${Array.from(ALLOWED_TILED_MIME_TYPES).join(", ")}`,
        },
      },
    );
  },
);

Deno.test(
  "validateFalGeneratePayload rejects invalid designContext types",
  () => {
    const result = validateFalGeneratePayload({
      userMessage: "스트라이프로 바꿔줘",
      designContext: {
        colors: "navy",
        fabricMethod: "invalid",
        ciPlacement: "one-point",
      },
      tiledBase64: "abc",
      tiledMimeType: "image/png",
    } as unknown as Parameters<typeof validateFalGeneratePayload>[0]);

    assertObjectMatch(result, {
      ok: false,
      status: 400,
      body: { error: "designContext.colors must be an array of strings" },
    });
  },
);

Deno.test(
  "validateFalGeneratePayload returns filtered conversation history for valid payloads",
  () => {
    const result = validateFalGeneratePayload({
      userMessage: "스트라이프로 바꿔줘",
      designContext: {
        colors: ["navy"],
        pattern: "stripe",
        fabricMethod: "yarn-dyed",
        ciPlacement: "all-over",
        scale: "medium",
      },
      tiledBase64: "abc",
      tiledMimeType: "image/png",
      conversationHistory: [
        { role: "user", content: "이전 요청" },
        { role: "invalid", content: "" },
      ],
    } as unknown as Parameters<typeof validateFalGeneratePayload>[0]);

    assertEquals(result.ok, true);
    if (result.ok) {
      assertEquals(result.conversationHistory, [
        { role: "user", content: "이전 요청" },
      ]);
    }
  },
);

Deno.test("shouldProceedToFalRender blocks non-renderable analyses", () => {
  assertEquals(
    shouldProceedToFalRender(true, {
      eligibleForRender: false,
      missingRequirements: [],
    }),
    false,
  );
  assertEquals(
    shouldProceedToFalRender(true, {
      eligibleForRender: true,
      missingRequirements: ["fabricMethod"],
    }),
    false,
  );
  assertEquals(
    shouldProceedToFalRender(false, {
      eligibleForRender: true,
      missingRequirements: [],
    }),
    false,
  );
  assertEquals(
    shouldProceedToFalRender(true, {
      eligibleForRender: true,
      missingRequirements: [],
    }),
    true,
  );
});
