import { describe, expect, it, vi } from "vitest";
import type { ButtonHTMLAttributes } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { GenerationLogTable } from "@/features/generation-logs/components/generation-log-table";
import type { AdminGenerationLogGroup } from "@/features/generation-logs/types/admin-generation-log";

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

const group: AdminGenerationLogGroup = {
  workflowId: "workflow-1",
  primaryLogId: "log-1",
  primaryWorkId: "work-1",
  userId: "user-1",
  aiModel: "openai",
  requestType: "render_standard",
  userMessage: "넥타이 패턴 4개 생성",
  patternType: "all_over",
  fabricType: "printed",
  imageCount: 4,
  successCount: 3,
  errorCount: 1,
  tokensCharged: 4,
  tokensRefunded: 1,
  totalLatencyMs: 8123,
  createdAt: "2026-04-29T05:00:00Z",
  resultImages: [
    {
      logId: "log-1",
      workId: "work-1",
      url: "https://ik.imagekit.io/app/1.webp",
      tileRole: "repeat",
      status: "success",
      totalLatencyMs: 2000,
    },
    {
      logId: "log-2",
      workId: "work-2",
      url: "https://ik.imagekit.io/app/2.webp",
      tileRole: "repeat",
      status: "success",
      totalLatencyMs: 2020,
    },
    {
      logId: "log-3",
      workId: "work-3",
      url: null,
      tileRole: "repeat",
      status: "error",
      totalLatencyMs: null,
    },
    {
      logId: "log-4",
      workId: "work-4",
      url: "https://ik.imagekit.io/app/4.webp",
      tileRole: "repeat",
      status: "success",
      totalLatencyMs: 2063,
    },
  ],
};

function LocationProbe() {
  const location = useLocation();

  return <span data-testid="location">{location.pathname}</span>;
}

describe("GenerationLogTable", () => {
  it("workflow 그룹의 4개 결과 썸네일과 성공 카운트를 표시한다", () => {
    render(
      <MemoryRouter>
        <GenerationLogTable
          data={[group]}
          loading={false}
          page={1}
          hasMore={false}
          onPageChange={() => undefined}
          aiModel={null}
          onAiModelChange={() => undefined}
        />
      </MemoryRouter>,
    );

    expect(screen.getAllByAltText(/생성 결과/)).toHaveLength(3);
    expect(screen.getByText("이미지 없음")).toBeInTheDocument();
    expect(screen.getByText("3/4 성공")).toBeInTheDocument();
    expect(screen.getByText("workflow-1")).toBeInTheDocument();
  });

  it("workflow 그룹 상세 이동은 행이 아니라 셀 내부 링크로 제공한다", () => {
    render(
      <MemoryRouter initialEntries={["/generation-logs"]}>
        <GenerationLogTable
          data={[group]}
          loading={false}
          page={1}
          hasMore={false}
          onPageChange={() => undefined}
          aiModel={null}
          onAiModelChange={() => undefined}
        />
        <LocationProbe />
      </MemoryRouter>,
    );

    const link = screen.getByRole("link", {
      name: "workflow-1 생성 로그 상세 보기",
    });
    const row = link.closest("tr");

    expect(row).not.toHaveAttribute("role", "button");
    expect(row).not.toHaveAttribute("tabindex");

    fireEvent.click(link);

    expect(screen.getByTestId("location")).toHaveTextContent(
      "/generation-logs/log-1",
    );
  });
});
