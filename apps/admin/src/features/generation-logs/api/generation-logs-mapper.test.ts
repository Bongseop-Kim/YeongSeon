import { describe, expect, it, vi } from "vitest";
import {
  toAdminGenerationLogItem,
  toGenerationStatsData,
} from "@/features/generation-logs/api/generation-logs-mapper";

const baseRow = {
  id: "log-1",
  work_id: "work-1",
  user_id: "user-1",
  ai_model: "openai",
  request_type: "analysis",
  quality: "standard",
  user_message: "디자인 생성해줘",
  prompt_length: 100,
  design_context: { style: "classic" },
  conversation_turn: 2,
  has_ci_image: true,
  has_reference_image: false,
  has_previous_image: false,
  ai_message: "생성 완료",
  generate_image: true,
  image_generated: true,
  generated_image_url: null,
  request_attachments: null,
  detected_design: { pattern: "solid" },
  tokens_charged: 10,
  tokens_refunded: 0,
  text_latency_ms: 300,
  image_latency_ms: 1200,
  total_latency_ms: 1500,
  error_type: null,
  created_at: "2026-03-15T09:00:00Z",
};

describe("toAdminGenerationLogItem", () => {
  it("정상 row를 올바르게 매핑한다", () => {
    expect(toAdminGenerationLogItem(baseRow)).toEqual({
      id: "log-1",
      workId: "work-1",
      userId: "user-1",
      aiModel: "openai",
      requestType: "analysis",
      quality: "standard",
      userMessage: "디자인 생성해줘",
      promptLength: 100,
      designContext: { style: "classic" },
      conversationTurn: 2,
      hasCiImage: true,
      hasReferenceImage: false,
      hasPreviousImage: false,
      aiMessage: "생성 완료",
      generateImage: true,
      imageGenerated: true,
      generatedImageUrl: null,
      requestAttachments: null,
      detectedDesign: { pattern: "solid" },
      tokensCharged: 10,
      tokensRefunded: 0,
      textLatencyMs: 300,
      imageLatencyMs: 1200,
      totalLatencyMs: 1500,
      errorType: null,
      createdAt: "2026-03-15T09:00:00Z",
    });
  });

  it("fal ai_model을 올바르게 매핑한다", () => {
    const result = toAdminGenerationLogItem({ ...baseRow, ai_model: "fal" });
    expect(result.aiModel).toBe("fal");
  });

  it("알 수 없는 ai_model은 openai로 폴백하고 경고를 출력한다", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = toAdminGenerationLogItem({
      ...baseRow,
      ai_model: "unknown",
    });
    expect(result.aiModel).toBe("openai");
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("deprecated gemini ai_model은 openai로 매핑하고 별도 경고를 출력한다", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = toAdminGenerationLogItem({
      ...baseRow,
      ai_model: "gemini",
    });

    expect(result.aiModel).toBe("openai");
    expect(warnSpy).toHaveBeenCalledWith(
      "[toAiModel] Mapping deprecated ai_model='gemini' to 'openai'",
    );

    warnSpy.mockRestore();
  });

  it("safe number 범위를 벗어난 숫자 문자열은 fallback으로 매핑한다", () => {
    const result = toAdminGenerationLogItem({
      ...baseRow,
      prompt_length: "9007199254740992",
    });

    expect(result.promptLength).toBe(0);
  });

  it("request_type이 render_standard이면 그대로 매핑한다", () => {
    const result = toAdminGenerationLogItem({
      ...baseRow,
      request_type: "render_standard",
    });
    expect(result.requestType).toBe("render_standard");
  });

  it("request_type이 render_high이면 그대로 매핑한다", () => {
    const result = toAdminGenerationLogItem({
      ...baseRow,
      request_type: "render_high",
    });
    expect(result.requestType).toBe("render_high");
  });

  it("request_type이 prep이면 그대로 매핑한다", () => {
    const result = toAdminGenerationLogItem({
      ...baseRow,
      request_type: "prep",
    });
    expect(result.requestType).toBe("prep");
  });

  it("잘못된 문자열 prep_tokens_charged는 0이 아니라 undefined로 버린다", () => {
    const result = toAdminGenerationLogItem({
      ...baseRow,
      prep_tokens_charged: "not-a-number",
    });
    expect(result.prepTokensCharged).toBeUndefined();
  });

  it("request_type이 알 수 없는 값이면 null을 반환한다", () => {
    const result = toAdminGenerationLogItem({
      ...baseRow,
      request_type: "invalid",
    });
    expect(result.requestType).toBeNull();
  });

  it("quality가 high이면 그대로 매핑한다", () => {
    const result = toAdminGenerationLogItem({ ...baseRow, quality: "high" });
    expect(result.quality).toBe("high");
  });

  it("quality가 알 수 없는 값이면 null을 반환한다", () => {
    const result = toAdminGenerationLogItem({ ...baseRow, quality: "ultra" });
    expect(result.quality).toBeNull();
  });

  it("generate_image가 null이면 null을 반환한다", () => {
    const result = toAdminGenerationLogItem({
      ...baseRow,
      generate_image: null,
    });
    expect(result.generateImage).toBeNull();
  });

  it("generate_image가 false이면 false를 반환한다", () => {
    const result = toAdminGenerationLogItem({
      ...baseRow,
      generate_image: false,
    });
    expect(result.generateImage).toBe(false);
  });

  it("design_context가 배열이면 null을 반환한다", () => {
    const result = toAdminGenerationLogItem({
      ...baseRow,
      design_context: [1, 2, 3],
    });
    expect(result.designContext).toBeNull();
  });

  it("detected_design이 null이면 null을 반환한다", () => {
    const result = toAdminGenerationLogItem({
      ...baseRow,
      detected_design: null,
    });
    expect(result.detectedDesign).toBeNull();
  });

  it("text_latency_ms가 null이면 null을 반환한다", () => {
    const result = toAdminGenerationLogItem({
      ...baseRow,
      text_latency_ms: null,
    });
    expect(result.textLatencyMs).toBeNull();
  });

  it("image_latency_ms가 null이면 null을 반환한다", () => {
    const result = toAdminGenerationLogItem({
      ...baseRow,
      image_latency_ms: null,
    });
    expect(result.imageLatencyMs).toBeNull();
  });

  it("total_latency_ms가 null이면 null을 반환한다", () => {
    const result = toAdminGenerationLogItem({
      ...baseRow,
      total_latency_ms: null,
    });
    expect(result.totalLatencyMs).toBeNull();
  });

  it("문자열 prompt_length를 숫자로 변환한다", () => {
    const result = toAdminGenerationLogItem({
      ...baseRow,
      prompt_length: "50",
    });
    expect(result.promptLength).toBe(50);
  });

  it("has_ci_image가 false면 false를 반환한다", () => {
    const result = toAdminGenerationLogItem({
      ...baseRow,
      has_ci_image: false,
    });
    expect(result.hasCiImage).toBe(false);
  });

  it("image_generated가 false면 false를 반환한다", () => {
    const result = toAdminGenerationLogItem({
      ...baseRow,
      image_generated: false,
    });
    expect(result.imageGenerated).toBe(false);
  });

  it("request_attachments를 Admin 뷰 모델로 매핑한다", () => {
    const result = toAdminGenerationLogItem({
      ...baseRow,
      request_attachments: [
        {
          type: "image",
          label: "CI 이미지",
          value: "ci",
          fileName: "brand-mark.png",
        },
        {
          type: "image",
          label: "참고 이미지",
          value: "reference",
          fileName: "stripe-reference.jpg",
        },
      ],
    });

    expect(result.requestAttachments).toEqual([
      {
        type: "image",
        label: "CI 이미지",
        value: "ci",
        fileName: "brand-mark.png",
      },
      {
        type: "image",
        label: "참고 이미지",
        value: "reference",
        fileName: "stripe-reference.jpg",
      },
    ]);
  });

  it("허용되지 않은 attachment type은 제외한다", () => {
    const result = toAdminGenerationLogItem({
      ...baseRow,
      request_attachments: [
        {
          type: "image",
          label: "CI 이미지",
          value: "ci",
          fileName: "brand-mark.png",
        },
        {
          type: "invalid",
          label: "잘못된 타입",
          value: "ignored",
        },
      ],
    });

    expect(result.requestAttachments).toEqual([
      {
        type: "image",
        label: "CI 이미지",
        value: "ci",
        fileName: "brand-mark.png",
      },
    ]);
  });

  it("유효한 워크플로우/패턴 준비 메타데이터를 함께 매핑한다", () => {
    const result = toAdminGenerationLogItem({
      ...baseRow,
      workflow_id: "workflow-1",
      phase: "prep",
      parent_work_id: "parent-1",
      normalized_design: { motif: "stripe" },
      eligible_for_render: false,
      missing_requirements: ["fabric", 3],
      eligibility_reason: "fabric_required",
      text_prompt: "텍스트 프롬프트",
      image_prompt: "이미지 프롬프트",
      image_edit_prompt: "이미지 편집 프롬프트",
      generated_image_url: "https://example.com/generated.png",
      pattern_preparation_backend: "openai_repair",
      pattern_repair_prompt_kind: "one_point_motif",
      pattern_repair_applied: false,
      pattern_repair_reason_codes: ["non_seamless_edges", 1, null],
      prep_tokens_charged: "42",
      error_message: "retry exhausted",
    });

    expect(result).toEqual(
      expect.objectContaining({
        workflowId: "workflow-1",
        phase: "prep",
        parentWorkId: "parent-1",
        normalizedDesign: { motif: "stripe" },
        eligibleForRender: false,
        missingRequirements: ["fabric", 3],
        eligibilityReason: "fabric_required",
        textPrompt: "텍스트 프롬프트",
        imagePrompt: "이미지 프롬프트",
        imageEditPrompt: "이미지 편집 프롬프트",
        generatedImageUrl: "https://example.com/generated.png",
        patternPreparationBackend: "openai_repair",
        patternRepairPromptKind: "one_point_motif",
        patternRepairApplied: false,
        patternRepairReasonCodes: ["non_seamless_edges"],
        prepTokensCharged: 42,
        errorMessage: "retry exhausted",
      }),
    );
  });

  it("문자열이 아닌 기본 식별자는 빈 문자열로 폴백한다", () => {
    const result = toAdminGenerationLogItem({
      ...baseRow,
      id: 123,
      work_id: false,
      user_id: {},
      user_message: ["invalid"],
      created_at: null,
    });

    expect(result).toEqual(
      expect.objectContaining({
        id: "",
        workId: "",
        userId: "",
        userMessage: "",
        createdAt: "",
      }),
    );
  });
});

describe("toGenerationStatsData", () => {
  it("non-record 입력이면 기본값을 반환한다", () => {
    expect(toGenerationStatsData(null)).toEqual({
      summary: {
        totalRequests: 0,
        imageSuccessRate: 0,
        totalTokensConsumed: 0,
        avgTotalLatencyMs: 0,
      },
      byModel: [],
      byInputType: [],
      byPattern: [],
      byError: [],
    });
  });

  it("배열 입력이면 기본값을 반환한다", () => {
    expect(toGenerationStatsData([])).toEqual({
      summary: {
        totalRequests: 0,
        imageSuccessRate: 0,
        totalTokensConsumed: 0,
        avgTotalLatencyMs: 0,
      },
      byModel: [],
      byInputType: [],
      byPattern: [],
      byError: [],
    });
  });

  it("완전한 통계 데이터를 올바르게 매핑한다", () => {
    const raw = {
      summary: {
        total_requests: 100,
        image_success_rate: 0.85,
        total_tokens_consumed: 500,
        avg_total_latency_ms: 1200,
      },
      by_model: [
        {
          ai_model: "openai",
          request_count: 70,
          avg_text_latency_ms: 300,
          avg_image_latency_ms: 1100,
          avg_token_cost: 5,
          image_success_rate: 0.9,
        },
      ],
      by_input_type: [
        {
          input_type: "text_only",
          request_count: 40,
          image_success_rate: 0.8,
          avg_latency_ms: 400,
          avg_token_cost: 3,
        },
      ],
      by_pattern: [
        {
          pattern: "classic",
          request_count: 30,
          image_success_rate: 0.88,
          avg_token_cost: 4,
        },
      ],
      by_error: [
        {
          error_type: "timeout",
          count: 5,
        },
      ],
    };

    const result = toGenerationStatsData(raw);

    expect(result.summary).toEqual({
      totalRequests: 100,
      imageSuccessRate: 0.85,
      totalTokensConsumed: 500,
      avgTotalLatencyMs: 1200,
    });
    expect(result.byModel).toEqual([
      {
        aiModel: "openai",
        requestCount: 70,
        avgTextLatencyMs: 300,
        avgImageLatencyMs: 1100,
        avgTokenCost: 5,
        imageSuccessRate: 0.9,
      },
    ]);
    expect(result.byInputType).toEqual([
      {
        inputType: "text_only",
        requestCount: 40,
        imageSuccessRate: 0.8,
        avgLatencyMs: 400,
        avgTokenCost: 3,
      },
    ]);
    expect(result.byPattern).toEqual([
      {
        pattern: "classic",
        requestCount: 30,
        imageSuccessRate: 0.88,
        avgTokenCost: 4,
      },
    ]);
    expect(result.byError).toEqual([
      {
        errorType: "timeout",
        count: 5,
      },
    ]);
  });

  it("by_pattern에서 pattern이 null이면 '(미지정)'으로 대체한다", () => {
    const raw = {
      summary: {},
      by_model: [],
      by_input_type: [],
      by_pattern: [
        {
          pattern: null,
          request_count: 10,
          image_success_rate: 0.5,
          avg_token_cost: 2,
        },
      ],
      by_error: [],
    };
    const result = toGenerationStatsData(raw);
    expect(result.byPattern[0].pattern).toBe("(미지정)");
  });

  it("by_error에서 error_type이 null이면 '성공'으로 대체한다", () => {
    const raw = {
      summary: {},
      by_model: [],
      by_input_type: [],
      by_pattern: [],
      by_error: [{ error_type: null, count: 50 }],
    };
    const result = toGenerationStatsData(raw);
    expect(result.byError[0].errorType).toBe("성공");
  });

  it("배열 필드가 없으면 빈 배열을 반환한다", () => {
    const result = toGenerationStatsData({ summary: {} });
    expect(result.byModel).toEqual([]);
    expect(result.byInputType).toEqual([]);
    expect(result.byPattern).toEqual([]);
    expect(result.byError).toEqual([]);
  });

  it("summary가 record가 아니면 0으로 대체한다", () => {
    const result = toGenerationStatsData({ summary: "invalid" });
    expect(result.summary).toEqual({
      totalRequests: 0,
      imageSuccessRate: 0,
      totalTokensConsumed: 0,
      avgTotalLatencyMs: 0,
    });
  });
});
