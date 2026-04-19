import { describe, expect, it } from "vitest";
import {
  buildInvokePayload,
  getTags,
  normalizeInvokeResponse,
  toDesignTokenHistoryItem,
} from "@/entities/design/api/ai-design-mapper";
import type { AiDesignRequest } from "@/entities/design/model/ai-design-request";
import type { Attachment } from "@/entities/design/model/ai-design-types";
import type { DesignContext } from "@/entities/design/model/design-context";

type TestDesignContext = DesignContext & {
  scale?: "large" | "medium" | "small" | null;
};

const createDesignContext = (
  overrides: Partial<TestDesignContext> = {},
): TestDesignContext => ({
  colors: [],
  pattern: null,
  fabricMethod: null,
  ciImage: null,
  ciPlacement: null,
  referenceImage: null,
  scale: null,
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
  sessionId: "test-session-id",
  firstMessage: "테스트 요청",
  allMessages: [],
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

  it("예상 밖의 designContext 값은 태그에 undefined를 넣지 않는다", () => {
    expect(
      getTags(
        createAiDesignRequest({
          designContext: {
            colors: [],
            pattern: "unknown-pattern" as never,
            fabricMethod: "unknown-fabric" as never,
            ciImage: null,
            ciPlacement: "unknown-placement" as never,
            referenceImage: null,
            scale: null,
          },
        }),
      ),
    ).toEqual(["클래식", "프리미엄", "넥타이"]);
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

describe("buildInvokePayload", () => {
  it("invoke body 구성을 request와 인코딩 결과로 분리한다", () => {
    const request = createAiDesignRequest({
      conversationHistory: [{ role: "user", content: "이전 요청" }],
      designContext: createDesignContext({
        colors: ["navy"],
        pattern: "stripe",
        fabricMethod: "print",
        ciPlacement: "one-point",
        ciImage: { type: "image/png" } as File,
        referenceImage: { type: "image/jpeg" } as File,
        scale: "medium",
      }),
    });

    expect(
      buildInvokePayload(request, {
        ciImageBase64: "ci-base64",
        referenceImageBase64: "ref-base64",
        tiledBase64: "tiled-base64",
        tiledMimeType: "image/png",
      }),
    ).toEqual({
      userMessage: "테스트 요청",
      designContext: {
        colors: ["navy"],
        pattern: "stripe",
        fabricMethod: "print",
        ciPlacement: "one-point",
        scale: "medium",
      },
      conversationHistory: [{ role: "user", content: "이전 요청" }],
      ciImageBase64: "ci-base64",
      ciImageMimeType: "image/png",
      referenceImageBase64: "ref-base64",
      referenceImageMimeType: "image/jpeg",
      tiledBase64: "tiled-base64",
      tiledMimeType: "image/png",
      sessionId: "test-session-id",
      firstMessage: "테스트 요청",
      allMessages: [],
      executionMode: "auto",
      analysisWorkId: null,
    });
  });

  it("scale, executionMode, analysisWorkId를 payload에 포함한다", () => {
    const payload = buildInvokePayload(
      createAiDesignRequest({
        designContext: createDesignContext({
          colors: ["navy"],
          pattern: "stripe",
          fabricMethod: "yarn-dyed",
          ciPlacement: null,
          ciImage: null,
          referenceImage: null,
          scale: "large",
        }),
        executionMode: "analysis_only",
        analysisWorkId: "analysis-1",
      }),
      {},
    );

    expect(payload.designContext?.scale).toBe("large");
    expect(payload.executionMode).toBe("analysis_only");
    expect(payload.analysisWorkId).toBe("analysis-1");
  });
});

describe("buildInvokePayload — 세션 필드", () => {
  const baseRequest = createAiDesignRequest({
    userMessage: "네이비 스트라이프",
    sessionId: "session-abc",
    firstMessage: "첫 메시지",
    allMessages: [
      {
        id: "msg-1",
        role: "user" as const,
        content: "네이비 스트라이프",
        imageUrl: null,
        imageFileId: null,
        sequenceNumber: 0,
      },
    ],
  });

  it("sessionId, firstMessage, allMessages가 payload에 포함된다", () => {
    const payload = buildInvokePayload(baseRequest, {});

    expect(payload.sessionId).toBe("session-abc");
    expect(payload.firstMessage).toBe("첫 메시지");
    expect(payload.allMessages).toHaveLength(1);
    expect(payload.allMessages[0].id).toBe("msg-1");
  });
});

describe("normalizeInvokeResponse", () => {
  it("invoke 응답을 UI 응답 모델로 정규화한다", () => {
    const request = createAiDesignRequest({
      attachments: [createAttachment({ type: "color", label: "네이비" })],
    });

    expect(
      normalizeInvokeResponse(
        {
          aiMessage: "시안을 만들었습니다.",
          imageUrl: "https://example.com/design.png",
          workflowId: "workflow-1",
          analysisWorkId: "analysis-1",
          generateImage: true,
          eligibleForRender: true,
          missingRequirements: ["pattern"],
          contextChips: [{ label: "네이비", action: "color" }],
          remainingTokens: 4,
        },
        request,
      ),
    ).toEqual({
      aiMessage: "시안을 만들었습니다.",
      imageUrl: "https://example.com/design.png",
      workflowId: "workflow-1",
      analysisWorkId: "analysis-1",
      generateImage: true,
      eligibleForRender: true,
      missingRequirements: ["pattern"],
      tags: ["네이비"],
      contextChips: [{ label: "네이비", action: "color" }],
      remainingTokens: 4,
    });
  });

  it("null scalar wire values는 undefined로 정규화한다", () => {
    const result = normalizeInvokeResponse(
      {
        aiMessage: "응답",
        imageUrl: null,
        workId: null,
        workflowId: null,
        analysisWorkId: null,
        generateImage: null,
        eligibleForRender: null,
        missingRequirements: [],
        contextChips: [],
      },
      createAiDesignRequest(),
    );

    expect(result.workId).toBeUndefined();
    expect(result.workflowId).toBeUndefined();
    expect(result.analysisWorkId).toBeUndefined();
    expect(result.generateImage).toBeUndefined();
    expect(result.eligibleForRender).toBeUndefined();
  });

  it("malformed missingRequirements는 문자열만 남긴다", () => {
    const result = normalizeInvokeResponse(
      {
        aiMessage: "응답",
        missingRequirements: ["fabric", null, 1, "pattern", undefined],
        contextChips: [],
      },
      createAiDesignRequest(),
    );

    expect(result.missingRequirements).toEqual(["fabric", "pattern"]);
  });

  it("malformed contextChips는 유효한 chip 객체만 남긴다", () => {
    const result = normalizeInvokeResponse(
      {
        aiMessage: "응답",
        missingRequirements: [],
        contextChips: [
          { label: "유효", action: "color" },
          { label: "  네이비  ", action: "  color  " },
          { label: "", action: "color" },
          { label: "   ", action: "color" },
          { label: "유효2", action: "" },
          { label: "유효3", action: "   " },
          { type: "color", label: "무효" },
          null,
        ],
      },
      createAiDesignRequest(),
    );

    expect(result.contextChips).toEqual([
      { label: "유효", action: "color" },
      { label: "네이비", action: "color" },
    ]);
  });

  it("비정상 응답 필드는 안전한 기본값으로 정규화한다", () => {
    expect(
      normalizeInvokeResponse(
        {
          aiMessage: "응답",
          contextChips: "invalid",
          remainingTokens: "invalid",
        },
        createAiDesignRequest(),
      ),
    ).toEqual({
      aiMessage: "응답",
      imageUrl: null,
      workflowId: undefined,
      analysisWorkId: undefined,
      generateImage: undefined,
      eligibleForRender: undefined,
      missingRequirements: [],
      tags: ["클래식", "프리미엄", "넥타이"],
      contextChips: [],
      remainingTokens: undefined,
    });
  });
});
