import { describe, expect, it } from "vitest";
import { SEAMLESS_LOG_PAGE_SIZE } from "@/features/seamless-logs/constants";
import {
  toAdminSeamlessLogItem,
  toSeamlessStatsData,
} from "@/features/seamless-logs/api/seamless-logs-mapper";
import {
  inputTypeLabel,
  statusLabel,
  statusTone,
} from "@/features/seamless-logs/utils";
import { hasJsonBlockContent } from "@/features/seamless-logs/utils/json-block";

const baseRow = {
  id: "log-1",
  request_id: "request-1",
  input_type: "reference_image",
  prompt: "crest pattern",
  has_reference_image: true,
  reference_image_bytes: "1024",
  colorway: "navy",
  seed: 123n,
  candidate_count_requested: 4,
  candidate_count_returned: "3",
  distinct_layouts: 2,
  available_strategies: "5",
  engine_version: "engine-1",
  registry_version: "registry-1",
  intent: { subject: "crest" },
  candidates: [
    {
      id: "candidate-1",
      layout_id: "layout-1",
      source_fidelity: "high",
      colorway_id: "colorway-1",
      seed: "77",
      png_url: "https://example.com/preview.png",
      svg: "<svg />",
    },
    "bad-candidate",
  ],
  warnings: ["first", 1, "second"],
  generate_ms: "120.5",
  render_ms: 80,
  status: "partial",
  error_type: "render_warning",
  error_message: "partial result",
  created_at: "2026-06-23T00:00:00Z",
};

describe("toAdminSeamlessLogItem", () => {
  it("정상 row를 화면 모델로 매핑한다", () => {
    expect(toAdminSeamlessLogItem(baseRow)).toEqual({
      id: "log-1",
      requestId: "request-1",
      inputType: "reference_image",
      prompt: "crest pattern",
      hasReferenceImage: true,
      referenceImageBytes: 1024,
      colorway: "navy",
      seed: 123,
      candidateCountRequested: 4,
      candidateCountReturned: 3,
      distinctLayouts: 2,
      availableStrategies: 5,
      engineVersion: "engine-1",
      registryVersion: "registry-1",
      intent: { subject: "crest" },
      candidates: [
        {
          id: "candidate-1",
          layoutId: "layout-1",
          sourceFidelity: "high",
          colorwayId: "colorway-1",
          seed: 77,
          pngUrl: "https://example.com/preview.png",
          svg: "<svg />",
        },
      ],
      warnings: ["first", "second"],
      generateMs: 120.5,
      renderMs: 80,
      status: "partial",
      errorType: "render_warning",
      errorMessage: "partial result",
      createdAt: "2026-06-23T00:00:00Z",
    });
  });

  it("잘못된 값은 null 또는 기본값으로 매핑한다", () => {
    const result = toAdminSeamlessLogItem({
      ...baseRow,
      id: 1,
      input_type: "bad",
      has_reference_image: "true",
      reference_image_bytes: Number.POSITIVE_INFINITY,
      seed: "9007199254740992",
      intent: [],
      candidates: "bad",
      warnings: "bad",
      status: "bad",
      created_at: null,
    });

    expect(result.id).toBe("");
    expect(result.inputType).toBeNull();
    expect(result.hasReferenceImage).toBe(false);
    expect(result.referenceImageBytes).toBeNull();
    expect(result.seed).toBeNull();
    expect(result.intent).toBeNull();
    expect(result.candidates).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.status).toBeNull();
    expect(result.createdAt).toBe("");
  });
});

describe("toSeamlessStatsData", () => {
  it("집계 응답을 화면 모델로 매핑한다", () => {
    expect(
      toSeamlessStatsData({
        summary: {
          total: "10",
          success_count: 6,
          partial_count: "3",
          error_count: 1n,
          avg_generate_ms: "140.5",
          avg_render_ms: 70,
        },
        by_input_type: [
          { input_type: "intent", count: "7" },
          { input_type: null, count: "2" },
        ],
        by_status: [
          { status: "success", count: "6" },
          { status: null, count: "1" },
        ],
      }),
    ).toEqual({
      summary: {
        total: 10,
        successCount: 6,
        partialCount: 3,
        errorCount: 1,
        avgGenerateMs: 140.5,
        avgRenderMs: 70,
      },
      byInputType: [
        { inputType: "intent", count: 7 },
        { inputType: "(미지정)", count: 2 },
      ],
      byStatus: [
        { status: "success", count: 6 },
        { status: "(미지정)", count: 1 },
      ],
    });
  });

  it("잘못된 집계 응답은 빈 집계로 매핑한다", () => {
    expect(toSeamlessStatsData(null)).toEqual({
      summary: {
        total: 0,
        successCount: 0,
        partialCount: 0,
        errorCount: 0,
        avgGenerateMs: 0,
        avgRenderMs: 0,
      },
      byInputType: [],
      byStatus: [],
    });
  });
});

describe("seamless log utils", () => {
  it("라벨, tone, JSON block empty 상태를 판정한다", () => {
    expect(SEAMLESS_LOG_PAGE_SIZE).toBe(50);
    expect(inputTypeLabel("prompt")).toBe("prompt");
    expect(inputTypeLabel("bad")).toBe("-");
    expect(statusLabel("error")).toBe("에러");
    expect(statusLabel("bad")).toBe("-");
    expect(statusTone("success")).toBe("positive");
    expect(statusTone("partial")).toBe("warning");
    expect(statusTone("error")).toBe("critical");
    expect(statusTone("bad")).toBe("neutral");
    expect(hasJsonBlockContent(null)).toBe(false);
    expect(hasJsonBlockContent({})).toBe(false);
    expect(hasJsonBlockContent([])).toBe(false);
    expect(hasJsonBlockContent(["x"])).toBe(true);
  });
});
