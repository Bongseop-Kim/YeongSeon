import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as DesignEntities from "@/entities/design";
import { DesignGenerationFeed } from "@/features/design/components/feed/design-generation-feed";
import { useDesignChatStore } from "@/features/design/store/design-chat-store";

const { designGenerationsQuery } = vi.hoisted(() => ({
  designGenerationsQuery: vi.fn(),
}));
const breakpoint = { isMobile: false, isDesktop: true };

vi.mock("@/shared/lib/breakpoint-provider", () => ({
  useBreakpoint: () => breakpoint,
}));

vi.mock("@/entities/design", async (importOriginal) => {
  const actual = await importOriginal<typeof DesignEntities>();
  return {
    ...actual,
    useDesignGenerationsQuery: () => designGenerationsQuery(),
    useDeleteDesignGenerationMutation: () => ({
      mutate: vi.fn(),
      isPending: false,
    }),
  };
});

const sharedTileUrl = "https://example.com/shared-repeat.webp";

const duplicateAssetGeneration = {
  id: "generation-1",
  userId: "user-1",
  prompt: "네이비 스트라이프",
  patternType: "all_over",
  fabricType: "printed",
  requestMetadata: {
    selectedColors: [],
    attachments: [],
    route: "tile_generation",
  },
  variants: ([1, 2] as const).map((index) => ({
    id: `variant-${index}`,
    generationId: "generation-1",
    index,
    repeatTile: {
      url: sharedTileUrl,
      workId: `repeat-work-${index}`,
    },
    accentTile: null,
    accentLayout: null,
    patternType: "all_over",
    fabricType: "printed",
    createdAt: "2026-04-29T00:00:00.000Z",
  })),
  createdAt: "2026-04-29T00:00:00.000Z",
  updatedAt: "2026-04-29T00:00:00.000Z",
} satisfies DesignEntities.DesignGeneration;

const renderFeed = () => {
  const queryClient = new QueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <DesignGenerationFeed onReusePrompt={vi.fn()} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

describe("DesignGenerationFeed", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    designGenerationsQuery.mockReset();
    breakpoint.isMobile = false;
    breakpoint.isDesktop = true;
    useDesignChatStore.getState().resetConversation();
    useDesignChatStore.setState({ generationStatus: "idle" });
  });

  it("같은 이미지 URL을 공유하는 variant도 고유 id로 선택 상태를 구분한다", async () => {
    designGenerationsQuery.mockReturnValue({
      data: [duplicateAssetGeneration],
      isLoading: false,
      isError: false,
      error: null,
    });

    renderFeed();

    await userEvent.click(
      screen.getByRole("button", { name: "variant 2 선택" }),
    );

    expect(
      screen.getByRole("button", { name: "variant 1 선택" }),
    ).toHaveAttribute("aria-pressed", "false");
    expect(
      screen.getByRole("button", { name: "variant 2 선택" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("모바일에서 생성 이미지 클릭 시 PC 프리뷰와 같은 반복 타일 모달을 표시한다", async () => {
    breakpoint.isMobile = true;
    breakpoint.isDesktop = false;
    designGenerationsQuery.mockReturnValue({
      data: [duplicateAssetGeneration],
      isLoading: false,
      isError: false,
      error: null,
    });

    renderFeed();

    await userEvent.click(
      screen.getByRole("button", { name: "variant 1 선택" }),
    );

    expect(
      screen.getByRole("dialog", { name: "넥타이 미리보기" }),
    ).toBeInTheDocument();
    const tileLayer = screen.getByTestId("tile-preview-layer");

    expect(tileLayer?.style.backgroundImage).toBe(
      'url("https://example.com/shared-repeat.webp")',
    );
    expect(tileLayer?.style.backgroundSize).toBe("35px 35px");
  });

  it("빈 생성 기록에서는 카카오톡 문의 버튼을 표시하고 채팅을 연다", async () => {
    vi.stubEnv("VITE_KAKAO_JAVASCRIPT_KEY", "");
    const open = vi.fn();
    vi.stubGlobal("open", open);
    designGenerationsQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
    });

    renderFeed();

    expect(
      screen.queryByText(
        "하단 입력창에서 첫 디자인을 생성하면 결과가 여기에 표시됩니다.",
      ),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("현재 디자인 생성 서비스는 베타 서비스입니다."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/문의가 있으면 카카오톡 문의 버튼을 눌러 문의해주세요/),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "토큰 충전하기" })).toHaveAttribute(
      "href",
      "/token/purchase",
    );

    await userEvent.click(
      screen.getByRole("button", { name: "카카오톡 문의" }),
    );

    expect(open).toHaveBeenCalledWith(
      "https://pf.kakao.com/_gZpqX/chat",
      "_blank",
      "noopener,noreferrer",
    );
  });

  it("생성 기록 조회 실패는 빈 상태 대신 오류 메시지와 재시도 버튼을 표시한다", async () => {
    const refetch = vi.fn();
    designGenerationsQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isError: true,
      error: new Error("network failed"),
      refetch,
    });

    renderFeed();

    expect(
      screen.getByText("생성 기록을 불러오지 못했습니다."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(
        "하단 입력창에서 첫 디자인을 생성하면 결과가 여기에 표시됩니다.",
      ),
    ).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "다시 시도" }));

    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
