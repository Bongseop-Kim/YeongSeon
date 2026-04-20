import { assertEquals, assertObjectMatch } from "jsr:@std/assert@1.0.19";
import {
  MAX_IMAGE_BASE64_LENGTH,
  shouldProceedToFalRender,
  validateFalGeneratePayload,
} from "./fal-request-validation.ts";

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
        body: { error: "fal_tiling_requires_tiled_or_reference_image" },
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
          error: "invalid_tiled_mime_type",
        },
      },
    );
  },
);

Deno.test("validateFalGeneratePayload rejects invalid fal route", () => {
  const result = validateFalGeneratePayload({
    userMessage: "포인트를 아래로 내려줘",
    route: "unknown",
    designContext: {
      colors: ["navy"],
      fabricMethod: "print",
      ciPlacement: "one-point",
    },
    baseImageUrl: "https://example.com/base.png",
  } as unknown as Parameters<typeof validateFalGeneratePayload>[0]);

  assertObjectMatch(result, {
    ok: false,
    status: 400,
    body: { error: "invalid_fal_route" },
  });
});

Deno.test("validateFalGeneratePayload rejects oversized tiled images", () => {
  const result = validateFalGeneratePayload({
    userMessage: "스트라이프로 바꿔줘",
    designContext: {
      colors: ["navy"],
      fabricMethod: "yarn-dyed",
      ciPlacement: "all-over",
    },
    tiledBase64: "a".repeat(MAX_IMAGE_BASE64_LENGTH + 1),
    tiledMimeType: "image/png",
  });

  assertObjectMatch(result, {
    ok: false,
    status: 413,
    body: { error: "tiled_image_too_large" },
  });
});

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
  "validateFalGeneratePayload rejects non-allowed design patterns",
  () => {
    const result = validateFalGeneratePayload({
      userMessage: "스트라이프로 바꿔줘",
      designContext: {
        colors: ["navy"],
        pattern: "zigzag",
        fabricMethod: "yarn-dyed",
        ciPlacement: "all-over",
      },
      tiledBase64: "abc",
      tiledMimeType: "image/png",
    } as unknown as Parameters<typeof validateFalGeneratePayload>[0]);

    assertObjectMatch(result, {
      ok: false,
      status: 400,
      body: { error: "invalid_design_pattern" },
    });
  },
);

Deno.test(
  "validateFalGeneratePayload rejects non-string design patterns",
  () => {
    const result = validateFalGeneratePayload({
      userMessage: "스트라이프로 바꿔줘",
      designContext: {
        colors: ["navy"],
        pattern: 123,
        fabricMethod: "yarn-dyed",
        ciPlacement: "all-over",
      },
      tiledBase64: "abc",
      tiledMimeType: "image/png",
    } as unknown as Parameters<typeof validateFalGeneratePayload>[0]);

    assertObjectMatch(result, {
      ok: false,
      status: 400,
      body: { error: "invalid_design_pattern" },
    });
  },
);

Deno.test("validateFalGeneratePayload rejects missing user messages", () => {
  const result = validateFalGeneratePayload({
    designContext: {
      colors: ["navy"],
      fabricMethod: "yarn-dyed",
      ciPlacement: "all-over",
    },
    tiledBase64: "abc",
    tiledMimeType: "image/png",
  } as unknown as Parameters<typeof validateFalGeneratePayload>[0]);

  assertObjectMatch(result, {
    ok: false,
    status: 400,
    body: { error: "invalid_user_message" },
  });
});

Deno.test(
  "validateFalGeneratePayload rejects overly long user messages",
  () => {
    const result = validateFalGeneratePayload({
      userMessage: "a".repeat(4001),
      designContext: {
        colors: ["navy"],
        fabricMethod: "yarn-dyed",
        ciPlacement: "all-over",
      },
      tiledBase64: "abc",
      tiledMimeType: "image/png",
    });

    assertObjectMatch(result, {
      ok: false,
      status: 400,
      body: { error: "invalid_user_message" },
    });
  },
);

Deno.test(
  "validateFalGeneratePayload rejects unsupported ci placement for fal render",
  () => {
    const result = validateFalGeneratePayload({
      userMessage: "스트라이프로 바꿔줘",
      designContext: {
        colors: ["navy"],
        fabricMethod: "yarn-dyed",
        ciPlacement: "one-point",
      },
      tiledBase64: "abc",
      tiledMimeType: "image/png",
    });

    assertObjectMatch(result, {
      ok: false,
      status: 400,
      body: { error: "ci_placement_must_be_all_over" },
    });
  },
);

Deno.test(
  "validateFalGeneratePayload accepts fal_edit with base image url",
  () => {
    const result = validateFalGeneratePayload({
      userMessage: "포인트 위치를 아래로 내려줘",
      route: "fal_edit",
      designContext: {
        colors: ["navy"],
        pattern: "stripe",
        fabricMethod: "print",
        ciPlacement: "one-point",
        scale: "medium",
      },
      baseImageUrl: "https://example.com/base.png",
      baseImageWorkId: "work-base-1",
      ciImageBase64: "abc",
      ciImageMimeType: "image/png",
    });

    assertEquals(result.ok, true);
  },
);

Deno.test(
  "validateFalGeneratePayload rejects fal_edit without base image url",
  () => {
    const result = validateFalGeneratePayload({
      userMessage: "포인트 위치를 아래로 내려줘",
      route: "fal_edit",
      designContext: {
        colors: ["navy"],
        fabricMethod: "print",
        ciPlacement: "one-point",
      },
    });

    assertObjectMatch(result, {
      ok: false,
      status: 400,
      body: { error: "base_image_url_required" },
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
