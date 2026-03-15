import { describe, expect, it } from "vitest";
import {
  getTags,
  toDesignTokenHistoryItem,
} from "@/features/design/api/ai-design-mapper";

describe("getTags", () => {
  it("attachment 라벨을 중복 제거 후 최대 3개까지 반환한다", () => {
    expect(
      getTags({
        attachments: [
          { type: "color", label: " 네이비 " },
          { type: "pattern", label: "스트라이프" },
          { type: "fabric", label: "실크" },
          { type: "color", label: "네이비" },
        ],
        designContext: {},
      }),
    ).toEqual(["네이비", "스트라이프", "실크"]);
  });

  it("attachment가 없으면 designContext 라벨을 fallback으로 사용한다", () => {
    expect(
      getTags({
        attachments: [],
        designContext: {
          pattern: "paisley",
          fabricMethod: "print",
          ciPlacement: "one-point",
        },
      }),
    ).toEqual(["페이즐리", "날염", "원포인트"]);
  });

  it("태그가 없으면 기본 태그를 반환한다", () => {
    expect(getTags({ attachments: [], designContext: {} })).toEqual([
      "클래식",
      "프리미엄",
      "넥타이",
    ]);
  });
});

describe("toDesignTokenHistoryItem", () => {
  it("snake_case row를 view 모델로 변환한다", () => {
    expect(
      toDesignTokenHistoryItem({
        id: "row-1",
        user_id: "user-1",
        amount: 3,
        type: "usage",
        ai_model: "gpt-4.1",
        request_type: "image",
        description: "AI 시안 생성",
        created_at: "2026-03-15T09:00:00Z",
        work_id: "work-1",
      }),
    ).toEqual({
      id: "row-1",
      amount: 3,
      type: "usage",
      aiModel: "gpt-4.1",
      requestType: "image",
      description: "AI 시안 생성",
      createdAt: "2026-03-15T09:00:00Z",
      workId: "work-1",
    });
  });
});
