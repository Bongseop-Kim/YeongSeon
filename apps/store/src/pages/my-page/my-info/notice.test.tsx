import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MyInfoNoticePage from "@/pages/my-page/my-info/notice";

const profileState = vi.hoisted(() => ({
  marketingConsent: {
    kakaoSms: false,
  },
}));

const refetchMock = vi.hoisted(() => vi.fn());
const mutateAsyncMock = vi.hoisted(() => vi.fn());
const toastErrorMock = vi.hoisted(() => vi.fn());
const profileResult = vi.hoisted(() => ({
  data: {
    marketingConsent: profileState.marketingConsent,
  },
  isLoading: false,
  isError: false,
  error: null,
  refetch: refetchMock,
}));

vi.mock("@/entities/my-page", () => ({
  useProfile: () => profileResult,
  useUpdateMarketingConsent: () => ({
    mutateAsync: mutateAsyncMock,
    isPending: false,
  }),
}));

vi.mock("@/shared/lib/toast", () => ({
  toast: {
    error: toastErrorMock,
  },
}));

vi.mock("@/shared/layout/main-layout", () => ({
  MainLayout: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  MainContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/shared/layout/page-layout", () => ({
  PageLayout: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/shared/composite/utility-page", () => ({
  UtilityPageAside: ({ children }: { children: React.ReactNode }) => (
    <aside>{children}</aside>
  ),
  UtilityPageIntro: ({
    title,
    description,
  }: {
    title: string;
    description: string;
  }) => (
    <section>
      <h1>{title}</h1>
      <p>{description}</p>
    </section>
  ),
  UtilityPageSection: ({
    title,
    description,
    children,
  }: {
    title: string;
    description: string;
    children: React.ReactNode;
  }) => (
    <section>
      <h2>{title}</h2>
      <p>{description}</p>
      {children}
    </section>
  ),
}));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MyInfoNoticePage />
    </QueryClientProvider>,
  );
}

describe("MyInfoNoticePage", () => {
  beforeEach(() => {
    profileState.marketingConsent.kakaoSms = false;
    refetchMock.mockReset().mockResolvedValue(undefined);
    mutateAsyncMock.mockReset().mockResolvedValue(undefined);
    toastErrorMock.mockReset();
  });

  it("스위치는 시각적 라벨과 접근성 이름으로 연결된다", () => {
    renderPage();

    expect(
      screen.getByRole("switch", { name: "카카오톡/문자" }),
    ).toBeInTheDocument();
  });

  it("저장 실패 시 이전 폼 값을 강제 복원하지 않고 프로필을 다시 조회한다", async () => {
    const user = userEvent.setup();

    mutateAsyncMock.mockRejectedValueOnce(new Error("timeout"));
    renderPage();

    const toggle = screen.getByRole("switch", { name: "카카오톡/문자" });

    await user.click(toggle);

    await waitFor(() => {
      expect(refetchMock).toHaveBeenCalled();
    });
    expect(toggle).toHaveAttribute("data-state", "checked");
    expect(toastErrorMock).toHaveBeenCalledWith("설정 저장에 실패했습니다.");
  });
});
