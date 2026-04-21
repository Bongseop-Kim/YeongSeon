import { afterEach, describe, expect, it, vi } from "vitest";
import {
  resolveGenerationRoute,
  resolveGenerationRouteAsync,
} from "@/entities/design/api/resolve-generation-route";
import * as classifier from "@/entities/design/api/route-classifier";

const createInput = (
  overrides: Partial<Parameters<typeof resolveGenerationRoute>[0]> = {},
) => ({
  userMessage: "테스트 요청",
  hasCiImage: false,
  hasReferenceImage: false,
  hasPreviousGeneratedImage: false,
  selectedPreviewImageUrl: null,
  detectedPattern: null,
  ...overrides,
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("resolveGenerationRoute", () => {
  it.each([
    {
      title: "sharp edge 체크 반복 요청은 fal_controlnet으로 보낸다",
      input: createInput({
        userMessage: "첨부한 이미지를 반복 패턴으로 만들어줘",
        hasCiImage: true,
        detectedPattern: " Check ",
      }),
      expected: {
        route: "fal_controlnet" as const,
        reason: "sharp_edge_pattern_repeat" as const,
        signals: [
          "ci_image_present",
          "pattern_repeat",
          "new_generation",
          "preserve_identity",
        ] as const,
      },
    },
    {
      title: "CI 첨부 + 올 패턴은 fal_tiling으로 보낸다",
      input: createInput({
        userMessage: "첨부한 이미지를 올 패턴으로 넥타이 디자인해줘",
        hasCiImage: true,
      }),
      expected: {
        route: "fal_tiling" as const,
        reason: "ci_image_with_pattern_repeat" as const,
        signals: [
          "ci_image_present",
          "pattern_repeat",
          "preserve_identity",
        ] as const,
      },
    },
    {
      title: "반복 패턴 요청은 fal_tiling으로 보낸다",
      input: createInput({
        userMessage: "첨부한 이미지를 반복 패턴으로 만들어줘",
        hasCiImage: true,
      }),
      expected: {
        route: "fal_tiling" as const,
        reason: "ci_image_with_pattern_repeat" as const,
        signals: [
          "ci_image_present",
          "pattern_repeat",
          "new_generation",
          "preserve_identity",
        ] as const,
      },
    },
    {
      title: "전체 반복 배치 요청은 fal_tiling으로 보낸다",
      input: createInput({
        userMessage: "CI 이미지를 전체에 반복 배치해줘",
        hasCiImage: true,
      }),
      expected: {
        route: "fal_tiling" as const,
        reason: "ci_image_with_pattern_repeat" as const,
        signals: [
          "ci_image_present",
          "pattern_repeat",
          "exact_placement",
          "preserve_identity",
        ] as const,
      },
    },
    {
      title: "기존 결과의 우측 하단 위치 수정은 fal_edit로 보낸다",
      input: createInput({
        userMessage: "첨부한 이미지를 우측 하단에 위치 시켜줘",
        hasPreviousGeneratedImage: true,
      }),
      expected: {
        route: "fal_edit" as const,
        reason: "existing_result_edit_request" as const,
        signals: [
          "previous_generated_image_present",
          "exact_placement",
          "edit_only",
        ] as const,
      },
    },
    {
      title: "선택된 프리뷰의 아래 이동 요청은 fal_edit로 보낸다",
      input: createInput({
        userMessage: "포인트 위치가 너무 높아 아래로 내려줘",
        selectedPreviewImageUrl: "https://example.com/base.png",
      }),
      expected: {
        route: "fal_edit" as const,
        reason: "existing_result_edit_request" as const,
        signals: [
          "selected_preview_image_present",
          "exact_placement",
          "edit_only",
        ] as const,
      },
    },
    {
      title: "로고를 그대로 두고 오른쪽으로 옮기는 요청은 fal_edit로 보낸다",
      input: createInput({
        userMessage: "로고를 그대로 두고 오른쪽으로만 옮겨줘",
        hasPreviousGeneratedImage: true,
      }),
      expected: {
        route: "fal_edit" as const,
        reason: "existing_result_edit_request" as const,
        signals: [
          "previous_generated_image_present",
          "exact_placement",
          "preserve_identity",
          "edit_only",
        ] as const,
      },
    },
    {
      title:
        "참고 이미지를 쓰되 로고를 오른쪽으로 옮기라는 요청은 fal_edit로 보낸다",
      input: createInput({
        userMessage: "use the reference image but move the logo right",
        hasReferenceImage: true,
        hasPreviousGeneratedImage: true,
      }),
      expected: {
        route: "fal_edit" as const,
        reason: "existing_result_edit_request" as const,
        signals: [
          "reference_image_present",
          "previous_generated_image_present",
          "exact_placement",
          "edit_only",
        ] as const,
      },
    },
    {
      title:
        "참고 이미지를 쓰되 반복을 더 작고 촘촘하게 하라는 요청은 fal_edit로 보낸다",
      input: createInput({
        userMessage: "use the reference image and repeat it smaller and denser",
        hasReferenceImage: true,
        hasPreviousGeneratedImage: true,
      }),
      expected: {
        route: "fal_edit" as const,
        reason: "existing_result_edit_request" as const,
        signals: [
          "reference_image_present",
          "previous_generated_image_present",
          "pattern_repeat",
          "modification_intent",
          "edit_only",
        ] as const,
      },
    },
    {
      title:
        "CI가 있어도 반복을 더 작고 촘촘하게 하라는 수정 요청은 fal_edit로 보낸다",
      input: createInput({
        userMessage: "반복해주고 더 작게 촘촘하게 해줘",
        hasCiImage: true,
        hasPreviousGeneratedImage: true,
      }),
      expected: {
        route: "fal_edit" as const,
        reason: "existing_result_edit_request" as const,
        signals: [
          "ci_image_present",
          "previous_generated_image_present",
          "pattern_repeat",
          "modification_intent",
          "preserve_identity",
          "edit_only",
        ] as const,
      },
    },
    {
      title: "참고해서 비슷하게 만들기는 openai로 보낸다",
      input: createInput({
        userMessage: "첨부한 이미지 참고해서 비슷하게 만들어줘",
        hasReferenceImage: true,
      }),
      expected: {
        route: "openai" as const,
        reason: "similar_mood_or_new_generation" as const,
        signals: [
          "reference_image_present",
          "similar_mood",
          "new_generation",
        ] as const,
      },
    },
    {
      title: "새로 만들어달라는 요청은 openai로 보낸다",
      input: createInput({
        userMessage: "이 느낌으로 새로 만들어줘",
        hasReferenceImage: true,
      }),
      expected: {
        route: "openai" as const,
        reason: "similar_mood_or_new_generation" as const,
        signals: [
          "reference_image_present",
          "similar_mood",
          "new_generation",
        ] as const,
      },
    },
  ])("$title", ({ input, expected }) => {
    expect(resolveGenerationRoute(input)).toEqual({
      route: expected.route,
      reason: expected.reason,
      usedIntentRouter: false,
      signals: [...expected.signals],
    });
  });

  it.each([
    {
      title: "startup 같은 단어의 up은 exact_placement로 오인하지 않는다",
      input: createInput({
        userMessage: "startup 해줘",
        hasCiImage: true,
      }),
      expectedSignals: ["ci_image_present"] as const,
    },
    {
      title: "downstream의 down은 exact_placement로 오인하지 않는다",
      input: createInput({
        userMessage: "downstream 구조를 검토해줘",
        hasReferenceImage: true,
      }),
      expectedSignals: ["reference_image_present"] as const,
    },
    {
      title: "leftover의 left는 exact_placement로 오인하지 않는다",
      input: createInput({
        userMessage: "leftover만 정리해줘",
        hasPreviousGeneratedImage: true,
      }),
      expectedSignals: ["previous_generated_image_present"] as const,
    },
    {
      title: "rightful의 right는 exact_placement로 오인하지 않는다",
      input: createInput({
        userMessage: "rightful choice",
        selectedPreviewImageUrl: "https://example.com/base.png",
      }),
      expectedSignals: ["selected_preview_image_present"] as const,
    },
    {
      title: "repeatable의 repeat는 pattern_repeat로 오인하지 않는다",
      input: createInput({
        userMessage: "repeatable texture guide",
      }),
      expectedSignals: [] as const,
    },
  ])("$title", ({ input, expectedSignals }) => {
    expect(resolveGenerationRoute(input)).toEqual({
      route: "openai",
      reason: "default_openai_generation",
      usedIntentRouter: false,
      signals: [...expectedSignals],
    });
  });

  it("반복 말고 오른쪽 아래에만 배치해줘는 fal_tiling으로 가지 않는다", () => {
    expect(
      resolveGenerationRoute(
        createInput({
          userMessage: "반복 말고 오른쪽 아래에만 배치해줘",
          hasCiImage: true,
        }),
      ),
    ).toEqual({
      route: "openai",
      reason: "default_openai_generation",
      usedIntentRouter: false,
      signals: ["ci_image_present", "exact_placement"],
    });
  });

  it("don't repeat는 fal_tiling으로 가지 않는다", () => {
    expect(
      resolveGenerationRoute(
        createInput({
          userMessage: "don't repeat",
          hasCiImage: true,
        }),
      ),
    ).toEqual({
      route: "openai",
      reason: "default_openai_generation",
      usedIntentRouter: false,
      signals: ["ci_image_present"],
    });
  });

  it("don't repeat, place it bottom right는 fal_tiling으로 가지 않는다", () => {
    expect(
      resolveGenerationRoute(
        createInput({
          userMessage: "don't repeat, place it bottom right",
          hasCiImage: true,
        }),
      ),
    ).toEqual({
      route: "openai",
      reason: "default_openai_generation",
      usedIntentRouter: false,
      signals: ["ci_image_present", "exact_placement"],
    });
  });

  it("don't tile, place it bottom right는 fal_tiling으로 가지 않는다", () => {
    expect(
      resolveGenerationRoute(
        createInput({
          userMessage: "don't tile, place it bottom right",
          hasCiImage: true,
        }),
      ),
    ).toEqual({
      route: "openai",
      reason: "default_openai_generation",
      usedIntentRouter: false,
      signals: ["ci_image_present", "exact_placement"],
    });
  });

  it("preview 기반 반복 요청만으로는 fal_edit로 가지 않는다", () => {
    expect(
      resolveGenerationRoute(
        createInput({
          userMessage: "반복해줘",
          selectedPreviewImageUrl: "https://example.com/base.png",
        }),
      ),
    ).toEqual({
      route: "openai",
      reason: "default_openai_generation",
      usedIntentRouter: false,
      signals: ["selected_preview_image_present", "pattern_repeat"],
    });
  });

  it("preview 기반 반복 + 크기 조정은 fal_edit로 간다", () => {
    expect(
      resolveGenerationRoute(
        createInput({
          userMessage: "반복해주고 더 작게 촘촘하게 해줘",
          selectedPreviewImageUrl: "https://example.com/base.png",
        }),
      ),
    ).toEqual({
      route: "fal_edit",
      reason: "existing_result_edit_request",
      usedIntentRouter: false,
      signals: [
        "selected_preview_image_present",
        "pattern_repeat",
        "modification_intent",
        "edit_only",
      ],
    });
  });

  it("같은 느낌으로 새로 만들어줘는 결과가 있어도 openai로 남는다", () => {
    expect(
      resolveGenerationRoute(
        createInput({
          userMessage: "같은 느낌으로 새로 만들어줘",
          hasPreviousGeneratedImage: true,
        }),
      ),
    ).toEqual({
      route: "openai",
      reason: "similar_mood_or_new_generation",
      usedIntentRouter: false,
      signals: [
        "previous_generated_image_present",
        "similar_mood",
        "new_generation",
      ],
    });
  });

  it("keep the vibe, create a new one은 결과가 있어도 openai로 남는다", () => {
    expect(
      resolveGenerationRoute(
        createInput({
          userMessage: "keep the vibe, create a new one",
          hasPreviousGeneratedImage: true,
        }),
      ),
    ).toEqual({
      route: "openai",
      reason: "similar_mood_or_new_generation",
      usedIntentRouter: false,
      signals: ["previous_generated_image_present", "new_generation"],
    });
  });
});

describe("resolveGenerationRouteAsync", () => {
  it("LLM 결과가 유효하면 해당 route를 사용한다", async () => {
    vi.spyOn(classifier, "classifyRouteWithLlm").mockResolvedValueOnce({
      route: "fal_inpaint",
      signals: ["edit_only"],
      confidence: 0.9,
      source: "llm",
    });

    const result = await resolveGenerationRouteAsync({
      userMessage: "이 부분만 수정",
      hasCiImage: false,
      hasReferenceImage: false,
      hasPreviousGeneratedImage: true,
      selectedPreviewImageUrl: null,
      detectedPattern: null,
    });

    expect(result).toEqual({
      route: "fal_inpaint",
      reason: "llm_classifier",
      signals: ["edit_only"],
      usedIntentRouter: false,
      source: "llm",
    });
  });

  it("LLM이 null이면 heuristic 폴백을 사용한다", async () => {
    vi.spyOn(classifier, "classifyRouteWithLlm").mockResolvedValueOnce(null);

    const result = await resolveGenerationRouteAsync({
      userMessage: "새 디자인",
      hasCiImage: false,
      hasReferenceImage: false,
      hasPreviousGeneratedImage: false,
      selectedPreviewImageUrl: null,
      detectedPattern: null,
    });

    expect(result.source).toBe("heuristic");
    expect(result.route).toBe("openai");
  });

  it("sharp-edge 반복 패턴은 LLM이 fal_tiling을 반환해도 fal_controlnet을 유지한다", async () => {
    vi.spyOn(classifier, "classifyRouteWithLlm").mockResolvedValueOnce({
      route: "fal_tiling",
      signals: ["pattern_repeat"],
      confidence: 0.95,
      source: "llm",
    });

    const result = await resolveGenerationRouteAsync({
      userMessage: "첨부한 이미지를 반복 패턴으로 만들어줘",
      hasCiImage: true,
      hasReferenceImage: false,
      hasPreviousGeneratedImage: false,
      selectedPreviewImageUrl: null,
      detectedPattern: " Stripe ",
    });

    expect(result).toEqual({
      route: "fal_controlnet",
      reason: "sharp_edge_pattern_repeat",
      signals: [
        "ci_image_present",
        "pattern_repeat",
        "new_generation",
        "preserve_identity",
      ],
      usedIntentRouter: false,
      source: "heuristic",
    });
  });
});
