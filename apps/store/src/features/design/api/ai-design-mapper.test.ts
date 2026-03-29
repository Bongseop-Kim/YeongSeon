import { describe, expect, it } from "vitest";
import { toDesignTokenHistoryItem } from "@/entities/design";
import { getTags } from "@/features/design/api/ai-design-mapper";
import type { AiDesignRequest } from "@/features/design/api/ai-design-api";
import type { Attachment } from "@/features/design/types/chat";
import type { DesignContext } from "@/features/design/types/design-context";

const createDesignContext = (
  overrides: Partial<DesignContext> = {},
): DesignContext => ({
  colors: [],
  pattern: null,
  fabricMethod: null,
  ciImage: null,
  ciPlacement: null,
  referenceImage: null,
  ...overrides,
});

const createAttachment = (
  overrides: Partial<Attachment> & Pick<Attachment, "type" | "label">,
): Attachment => ({
  value: overrides.label,
  ...overrides,
});

const createAiDesignRequest = (
  overrides: Partial<AiDesignRequest> = {},
): AiDesignRequest => ({
  userMessage: "테스트 요청",
  aiModel: "openai",
  attachments: [],
  designContext: createDesignContext(),
  ...overrides,
});

describe("getTags", () => {
  it("attachment 라벨을 중복 제거 후 최대 3개까지 반환한다", () => {
    expect(
      getTags(
        createAiDesignRequest({
          attachments: [
            createAttachment({ type: "color", label: " 네이비 " }),
            createAttachment({ type: "pattern", label: "스트라이프" }),
            createAttachment({ type: "fabric", label: "실크" }),
            createAttachment({ type: "color", label: "네이비" }),
          ],
        }),
      ),
    ).toEqual(["네이비", "스트라이프", "실크"]);
  });

  it("공백만 있는 attachment 라벨은 제외한다", () => {
    expect(
      getTags(
        createAiDesignRequest({
          attachments: [
            createAttachment({ type: "color", label: "   " }),
            createAttachment({ type: "pattern", label: " 스트라이프 " }),
            createAttachment({ type: "fabric", label: "실크" }),
          ],
        }),
      ),
    ).toEqual(["스트라이프", "실크"]);
  });

  it("attachment가 없으면 designContext 라벨을 fallback으로 사용한다", () => {
    expect(
      getTags(
        createAiDesignRequest({
          designContext: createDesignContext({
            pattern: "paisley",
            fabricMethod: "print",
            ciPlacement: "one-point",
          }),
        }),
      ),
    ).toEqual(["페이즐리", "날염", "원포인트"]);
  });

  it("태그가 없으면 기본 태그를 반환한다", () => {
    expect(getTags(createAiDesignRequest())).toEqual([
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
