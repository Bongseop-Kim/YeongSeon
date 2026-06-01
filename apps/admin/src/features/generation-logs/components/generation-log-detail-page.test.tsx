import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { GenerationLogDetailPage } from "@/features/generation-logs/components/generation-log-detail-page";
import { hasJsonBlockContent } from "@/features/generation-logs/utils/json-block";
import type { AdminGenerationLogItem } from "@/features/generation-logs/types/admin-generation-log";

const mocks = vi.hoisted(() => ({
  detailLog: null as AdminGenerationLogItem | null,
  workflowLogs: [] as AdminGenerationLogItem[],
}));

vi.mock("@/features/generation-logs/api/generation-logs-query", () => ({
  useGenerationLogDetailQuery: () => ({
    data: mocks.detailLog,
    isLoading: false,
    errorMessage: null,
  }),
  useGenerationWorkflowLogsQuery: () => ({
    data: mocks.workflowLogs,
    isLoading: false,
  }),
}));

vi.mock("seed-design/ui/action-button", () => ({
  ActionButton: ({
    children,
    loading: _loading,
    size: _size,
    variant: _variant,
    ...props
  }: ButtonHTMLAttributes<HTMLButtonElement> & {
    loading?: boolean;
    size?: string;
    variant?: string;
  }) => <button {...props}>{children}</button>,
}));

vi.mock("seed-design/ui/callout", () => ({
  Callout: ({
    description,
    role,
    title,
  }: {
    description?: ReactNode;
    role?: string;
    title?: ReactNode;
  }) => (
    <div role={role}>
      {title ? <p>{title}</p> : null}
      {description ? <p>{description}</p> : null}
    </div>
  ),
}));

const tileRoleOnlyLog: AdminGenerationLogItem = {
  id: "log-1",
  workId: "work-1",
  userId: "user-1",
  aiModel: "openai",
  requestType: null,
  quality: null,
  userMessage: "generate a tile",
  promptLength: 15,
  designContext: null,
  normalizedDesign: null,
  conversationTurn: 1,
  hasCiImage: false,
  hasReferenceImage: false,
  hasPreviousImage: false,
  aiMessage: null,
  generateImage: true,
  imagePrompt: null,
  route: null,
  imageGenerated: false,
  generatedImageUrl: null,
  repeatTileUrl: null,
  repeatTileWorkId: null,
  accentTileUrl: null,
  accentTileWorkId: null,
  patternType: null,
  fabricType: null,
  tileRole: "accent",
  pairedTileWorkId: null,
  accentLayoutJson: null,
  requestAttachments: null,
  detectedDesign: null,
  tokensCharged: 0,
  tokensRefunded: 0,
  textLatencyMs: null,
  imageLatencyMs: null,
  totalLatencyMs: null,
  errorType: null,
  errorMessage: null,
  createdAt: "2026-04-28T00:00:00.000Z",
};

describe("hasJsonBlockContent", () => {
  it("빈 객체는 표시 가능한 JSON 옵션으로 보지 않는다", () => {
    expect(hasJsonBlockContent({})).toBe(false);
  });

  it("값이 있는 객체와 배열은 표시 가능한 JSON 옵션으로 본다", () => {
    expect(hasJsonBlockContent({ pattern: "classic" })).toBe(true);
    expect(hasJsonBlockContent([])).toBe(true);
  });

  it("null과 undefined는 표시 가능한 JSON 옵션으로 보지 않는다", () => {
    expect(hasJsonBlockContent(null)).toBe(false);
    expect(hasJsonBlockContent(undefined)).toBe(false);
  });
});

describe("GenerationLogDetailPage", () => {
  beforeEach(() => {
    mocks.detailLog = null;
    mocks.workflowLogs = [];
  });

  it("tileRole만 있는 로그도 사용자 선택 옵션을 표시한다", () => {
    mocks.detailLog = tileRoleOnlyLog;

    render(
      <MemoryRouter>
        <GenerationLogDetailPage id="log-1" />
      </MemoryRouter>,
    );

    expect(screen.getByText("사용자 선택 옵션")).toBeInTheDocument();
    expect(screen.getByText("accent")).toBeInTheDocument();
  });

  it("첨부 이미지 옵션은 사용자 선택 옵션 Tag로 중복 표시하지 않는다", () => {
    mocks.detailLog = {
      ...tileRoleOnlyLog,
      requestAttachments: [
        {
          type: "image",
          label: "첨부 이미지",
          value: "https://ik.imagekit.io/app/ref.png",
          fileName: "ref.png",
        },
        {
          type: "color",
          label: "색상",
          value: "blue",
        },
      ],
    };

    render(
      <MemoryRouter>
        <GenerationLogDetailPage id="log-1" />
      </MemoryRouter>,
    );

    expect(screen.getAllByText("첨부 이미지").length).toBeGreaterThan(0);
    expect(screen.getByText("색상: blue")).toBeInTheDocument();
    expect(
      screen.queryByText(
        "첨부 이미지: https://ik.imagekit.io/app/ref.png (ref.png)",
      ),
    ).not.toBeInTheDocument();
  });

  it("저장된 이미지 프롬프트가 있으면 프롬프트 기록으로 표시한다", () => {
    mocks.detailLog = {
      ...tileRoleOnlyLog,
      imagePrompt: "repeat_prompt:\nReference image rule",
    };

    render(
      <MemoryRouter>
        <GenerationLogDetailPage id="log-1" />
      </MemoryRouter>,
    );

    expect(screen.getByText("이미지 생성 프롬프트")).toBeInTheDocument();
    expect(screen.getAllByText(/Reference image rule/).length).toBeGreaterThan(
      0,
    );
  });

  it("이미지 프롬프트가 저장되지 않은 과거 로그에는 미저장 안내를 표시한다", () => {
    mocks.detailLog = {
      ...tileRoleOnlyLog,
      imagePrompt: null,
    };

    render(
      <MemoryRouter>
        <GenerationLogDetailPage id="log-1" />
      </MemoryRouter>,
    );

    expect(
      screen.getByText("이미지 생성 프롬프트가 저장되지 않았습니다"),
    ).toBeInTheDocument();
  });

  it("실행 로그 상세 JSON 스냅샷과 저장 필드 안내를 표시하지 않는다", () => {
    mocks.detailLog = {
      ...tileRoleOnlyLog,
      requestAttachments: [
        {
          type: "color",
          label: "색상",
          value: "blue",
        },
      ],
      generatedImageUrl: "https://ik.imagekit.io/app/generated.webp",
    };

    render(
      <MemoryRouter>
        <GenerationLogDetailPage id="log-1" />
      </MemoryRouter>,
    );

    expect(
      screen.queryByText("로그에 저장된 실제 필드만 표시합니다"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("logged_request_fields")).not.toBeInTheDocument();
    expect(screen.queryByText("logged_result_fields")).not.toBeInTheDocument();
    expect(
      screen.getByText("기본 정보 & API 전송/실행 로그"),
    ).toBeInTheDocument();
  });

  it("레거시 입력 이미지 저장 실패 안내를 표시하지 않는다", () => {
    mocks.detailLog = tileRoleOnlyLog;

    render(
      <MemoryRouter>
        <GenerationLogDetailPage id="log-1" />
      </MemoryRouter>,
    );

    expect(
      screen.queryByText(
        "첨부 이미지는 있었지만 저장된 원본 이미지가 없습니다",
      ),
    ).not.toBeInTheDocument();
  });

  it("같은 workflow의 4개 생성 결과를 하나의 결과 세트로 표시한다", () => {
    const logs = Array.from({ length: 4 }, (_, index) => ({
      ...tileRoleOnlyLog,
      id: `log-${index + 1}`,
      workflowId: "workflow-1",
      workId: `work-${index + 1}`,
      generatedImageUrl: `https://ik.imagekit.io/app/${index + 1}.webp`,
      imageGenerated: true,
      totalLatencyMs: 2000 + index,
    }));
    mocks.detailLog = logs[0];
    mocks.workflowLogs = logs;

    render(
      <MemoryRouter>
        <GenerationLogDetailPage id="log-1" />
      </MemoryRouter>,
    );

    expect(screen.getByText("생성 결과 세트")).toBeInTheDocument();
    expect(screen.getAllByAltText(/생성 결과/)).toHaveLength(4);
    expect(screen.getByText("4/4 성공")).toBeInTheDocument();
    expect(screen.getByText("Variant 4")).toBeInTheDocument();
  });
});
