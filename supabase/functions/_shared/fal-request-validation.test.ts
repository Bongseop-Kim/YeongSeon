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
        tiledBase64: "",
        tiledMimeType: "image/png",
        referenceImageBase64: "valid-reference-base64",
      }),
      {
        ok: true,
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

Deno.test(
  "validateFalGeneratePayload allows render_from_analysis requests with valid analysisWorkId, route, and userMessage",
  () => {
    const result = validateFalGeneratePayload(
      {
        userMessage: "이대로 다시 렌더해줘",
        analysisWorkId: "analysis-1",
        route: "fal_tiling",
        executionMode: "render_from_analysis",
      } as unknown as Parameters<typeof validateFalGeneratePayload>[0],
      "render_from_analysis",
    );

    assertObjectMatch(result, {
      ok: true,
    });
  },
);

Deno.test(
  "validateFalGeneratePayload rejects invalid route for render_from_analysis",
  () => {
    const result = validateFalGeneratePayload(
      {
        userMessage: "이대로 다시 렌더해줘",
        analysisWorkId: "analysis-1",
        route: "unknown",
        executionMode: "render_from_analysis",
      } as unknown as Parameters<typeof validateFalGeneratePayload>[0],
      "render_from_analysis",
    );

    assertObjectMatch(result, {
      ok: false,
      status: 400,
      body: { error: "invalid_fal_route" },
    });
  },
);

Deno.test(
  "validateFalGeneratePayload rejects invalid userMessage for render_from_analysis",
  () => {
    const result = validateFalGeneratePayload(
      {
        userMessage: "   ",
        analysisWorkId: "analysis-1",
        route: "fal_tiling",
        executionMode: "render_from_analysis",
      } as unknown as Parameters<typeof validateFalGeneratePayload>[0],
      "render_from_analysis",
    );

    assertObjectMatch(result, {
      ok: false,
      status: 400,
      body: { error: "invalid_user_message" },
    });
  },
);

Deno.test("validateFalGeneratePayload accepts fal_controlnet payload", () => {
  const result = validateFalGeneratePayload({
    userMessage: "체크 패턴으로 반복해줘",
    route: "fal_controlnet",
    designContext: {
      colors: ["navy"],
      pattern: "check",
      fabricMethod: "yarn-dyed",
      ciPlacement: "all-over",
    },
    structureImageBase64: "abc",
    structureImageMimeType: "image/png",
    controlType: "lineart",
  } as unknown as Parameters<typeof validateFalGeneratePayload>[0]);

  assertObjectMatch(result, {
    ok: true,
  });
});

Deno.test(
  "validateFalGeneratePayload rejects invalid fal_controlnet payloads",
  () => {
    assertObjectMatch(
      validateFalGeneratePayload({
        userMessage: "체크 패턴으로 반복해줘",
        route: "fal_controlnet",
        designContext: {
          colors: ["navy"],
          pattern: "check",
          fabricMethod: "yarn-dyed",
          ciPlacement: "one-point",
        },
        structureImageBase64: "abc",
        structureImageMimeType: "image/png",
      } as unknown as Parameters<typeof validateFalGeneratePayload>[0]),
      {
        ok: false,
        status: 400,
        body: { error: "ci_placement_must_be_all_over" },
      },
    );

    assertObjectMatch(
      validateFalGeneratePayload({
        userMessage: "체크 패턴으로 반복해줘",
        route: "fal_controlnet",
        designContext: {
          colors: ["navy"],
          pattern: "check",
          fabricMethod: "yarn-dyed",
          ciPlacement: "all-over",
        },
        controlType: "unknown",
        structureImageBase64: "abc",
        structureImageMimeType: "image/png",
      } as unknown as Parameters<typeof validateFalGeneratePayload>[0]),
      {
        ok: false,
        status: 400,
        body: { error: "invalid_control_type" },
      },
    );

    assertObjectMatch(
      validateFalGeneratePayload({
        userMessage: "체크 패턴으로 반복해줘",
        route: "fal_controlnet",
        designContext: {
          colors: ["navy"],
          pattern: "check",
          fabricMethod: "yarn-dyed",
          ciPlacement: "all-over",
        },
        controlType: 123,
        structureImageBase64: "abc",
        structureImageMimeType: "image/png",
      } as unknown as Parameters<typeof validateFalGeneratePayload>[0]),
      {
        ok: false,
        status: 400,
        body: { error: "invalid_control_type" },
      },
    );
  },
);

Deno.test(
  "validateFalGeneratePayload validates fal_inpaint requirements",
  () => {
    assertObjectMatch(
      validateFalGeneratePayload({
        userMessage: "이 부분만 수정해줘",
        route: "fal_inpaint",
        designContext: {
          colors: ["navy"],
          pattern: "check",
          fabricMethod: "print",
          ciPlacement: "one-point",
        },
        baseImageUrl: "https://example.com/base.png",
        maskBase64: "mask",
        maskMimeType: " image/png ",
        editPrompt: "이 부분만 자수 느낌으로 바꿔줘",
      } as unknown as Parameters<typeof validateFalGeneratePayload>[0]),
      {
        ok: true,
      },
    );

    assertObjectMatch(
      validateFalGeneratePayload({
        userMessage: "이 부분만 수정해줘",
        route: "fal_inpaint",
        designContext: {
          colors: ["navy"],
          pattern: "check",
          fabricMethod: "print",
          ciPlacement: "one-point",
        },
        baseImageUrl: "https://example.com/base.png",
        maskMimeType: "image/png",
        editPrompt: "이 부분만 자수 느낌으로 바꿔줘",
      } as unknown as Parameters<typeof validateFalGeneratePayload>[0]),
      {
        ok: false,
        status: 400,
        body: { error: "mask_base64_required" },
      },
    );
  },
);

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
  "validateFalGeneratePayload rejects oversized reference and structure images",
  () => {
    assertObjectMatch(
      validateFalGeneratePayload({
        userMessage: "체크 패턴으로 반복해줘",
        route: "fal_tiling",
        designContext: {
          colors: ["navy"],
          pattern: "check",
          fabricMethod: "yarn-dyed",
          ciPlacement: "all-over",
        },
        referenceImageBase64: "a".repeat(MAX_IMAGE_BASE64_LENGTH + 1),
        referenceImageMimeType: "image/png",
      } as unknown as Parameters<typeof validateFalGeneratePayload>[0]),
      {
        ok: false,
        status: 413,
        body: { error: "reference_image_too_large" },
      },
    );

    assertObjectMatch(
      validateFalGeneratePayload({
        userMessage: "체크 패턴으로 반복해줘",
        route: "fal_controlnet",
        designContext: {
          colors: ["navy"],
          pattern: "check",
          fabricMethod: "yarn-dyed",
          ciPlacement: "all-over",
        },
        structureImageBase64: "a".repeat(MAX_IMAGE_BASE64_LENGTH + 1),
        structureImageMimeType: "image/png",
      } as unknown as Parameters<typeof validateFalGeneratePayload>[0]),
      {
        ok: false,
        status: 413,
        body: { error: "structure_image_too_large" },
      },
    );
  },
);

Deno.test(
  "validateFalGeneratePayload safely rejects non-string tiledBase64 for fal_controlnet",
  () => {
    const result = validateFalGeneratePayload({
      userMessage: "체크 패턴으로 반복해줘",
      route: "fal_controlnet",
      designContext: {
        colors: ["navy"],
        pattern: "check",
        fabricMethod: "yarn-dyed",
        ciPlacement: "all-over",
      },
      tiledBase64: 123 as unknown as string,
    } as unknown as Parameters<typeof validateFalGeneratePayload>[0]);

    assertObjectMatch(result, {
      ok: false,
      status: 400,
      body: { error: "fal_controlnet_requires_structure_or_tiled_image" },
    });
  },
);

Deno.test("validateFalGeneratePayload rejects oversized base images", () => {
  const result = validateFalGeneratePayload({
    userMessage: "이 부분만 수정해줘",
    route: "fal_inpaint",
    designContext: {
      colors: ["navy"],
      pattern: "check",
      fabricMethod: "print",
      ciPlacement: "one-point",
    },
    baseImageBase64: "a".repeat(MAX_IMAGE_BASE64_LENGTH + 1),
    baseImageMimeType: "image/png",
    maskBase64: "mask",
    maskMimeType: "image/png",
    editPrompt: "이 부분만 자수 느낌으로 바꿔줘",
  } as unknown as Parameters<typeof validateFalGeneratePayload>[0]);

  assertObjectMatch(result, {
    ok: false,
    status: 413,
    body: { error: "base_image_too_large" },
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
