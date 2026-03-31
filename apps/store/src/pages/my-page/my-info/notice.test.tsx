import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MyInfoNoticePage from "@/pages/my-page/my-info/notice";

const profileState = vi.hoisted(() => ({
  marketingConsent: { kakaoSms: false },
  phoneVerified: false,
  notificationEnabled: false,
  notificationConsent: false,
}));

const refetchMock = vi.hoisted(() => vi.fn());
const mutateAsyncMock = vi.hoisted(() => vi.fn());
const toastErrorMock = vi.hoisted(() => vi.fn());
const saveNotificationConsentMock = vi.hoisted(() => vi.fn());
const updateNotificationEnabledMock = vi.hoisted(() => vi.fn());
const profileData = vi.hoisted(() => ({
  get marketingConsent() {
    return { kakaoSms: profileState.marketingConsent.kakaoSms };
  },
  get phoneVerified() {
    return profileState.phoneVerified;
  },
  get notificationEnabled() {
    return profileState.notificationEnabled;
  },
  get notificationConsent() {
    return profileState.notificationConsent;
  },
}));

vi.mock("@/entities/my-page", () => ({
  useProfile: () => ({
    data: profileData,
    isLoading: false,
    isError: false,
    error: null,
    refetch: refetchMock,
  }),
  useUpdateMarketingConsent: () => ({
    mutateAsync: mutateAsyncMock,
    isPending: false,
  }),
}));

vi.mock("@/entities/notification", () => ({
  saveNotificationConsent: saveNotificationConsentMock,
  updateNotificationEnabled: updateNotificationEnabledMock,
  notificationStatusKeys: {
    all: ["notification-status"],
    detail: () => ["notification-status", "detail"],
  },
}));

vi.mock("@/features/notification", () => ({
  PhoneVerificationForm: ({
    onVerified,
  }: {
    onVerified: () => Promise<void>;
  }) => (
    <div>
      <p>전화번호 인증 폼</p>
      <button onClick={() => void onVerified()}>인증 완료</button>
    </div>
  ),
}));

vi.mock("@/shared/lib/toast", () => ({
  toast: { error: toastErrorMock },
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
  UtilityPageAside: ({
    title,
    children,
  }: {
    title: string;
    description?: string;
    children: React.ReactNode;
  }) => (
    <aside>
      <h3>{title}</h3>
      {children}
    </aside>
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
    defaultOptions: { queries: { retry: false } },
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
    profileState.phoneVerified = false;
    profileState.notificationEnabled = false;
    profileState.notificationConsent = false;
    refetchMock.mockReset().mockResolvedValue(undefined);
    mutateAsyncMock.mockReset().mockResolvedValue(undefined);
    toastErrorMock.mockReset();
    saveNotificationConsentMock.mockReset().mockResolvedValue(undefined);
    updateNotificationEnabledMock.mockReset().mockResolvedValue(undefined);
  });

  it("마케팅 스위치는 시각적 라벨과 접근성 이름으로 연결된다", () => {
    renderPage();
    expect(
      screen.getByRole("switch", { name: "카카오톡/문자" }),
    ).toBeInTheDocument();
  });

  it("서비스 알림 스위치가 렌더링된다", () => {
    renderPage();
    expect(
      screen.getByRole("switch", { name: "카카오톡/문자 알림" }),
    ).toBeInTheDocument();
  });

  it("마케팅 저장 실패 시 프로필을 다시 조회하고 에러 토스트를 표시한다", async () => {
    const user = userEvent.setup();
    mutateAsyncMock.mockRejectedValueOnce(new Error("timeout"));
    renderPage();

    const toggle = screen.getByRole("switch", { name: "카카오톡/문자" });
    await user.click(toggle);

    await waitFor(() => {
      expect(refetchMock).toHaveBeenCalled();
    });
    expect(toastErrorMock).toHaveBeenCalledWith("설정 저장에 실패했습니다.");
  });

  it("미인증 유저가 서비스 알림 토글을 켜면 인증 모달이 표시된다", async () => {
    const user = userEvent.setup();
    profileState.phoneVerified = false;
    renderPage();

    const toggle = screen.getByRole("switch", { name: "카카오톡/문자 알림" });
    await user.click(toggle);

    await waitFor(() => {
      expect(screen.getByText("전화번호 인증 폼")).toBeInTheDocument();
    });
  });

  it("인증 완료 후 saveNotificationConsent와 updateNotificationEnabled가 호출된다", async () => {
    const user = userEvent.setup();
    profileState.phoneVerified = false;
    profileState.notificationConsent = false;
    renderPage();

    const toggle = screen.getByRole("switch", { name: "카카오톡/문자 알림" });
    await user.click(toggle);

    await waitFor(() => {
      expect(screen.getByText("인증 완료")).toBeInTheDocument();
    });

    await user.click(screen.getByText("인증 완료"));

    await waitFor(() => {
      expect(saveNotificationConsentMock).toHaveBeenCalledWith(true);
      expect(updateNotificationEnabledMock).toHaveBeenCalledWith(true);
    });
  });

  it("phoneVerified=false이면 미인증 안내 문구를 표시한다", () => {
    profileState.phoneVerified = false;
    renderPage();

    expect(
      screen.getByText(
        "휴대폰 인증 및 수신 동의를 하지 않으면 주문 완료 및 진행 상황을 카카오톡 또는 메신저로 받을 수 없습니다.",
      ),
    ).toBeInTheDocument();
  });

  it("phoneVerified=true이면 서비스 알림 안내 문구를 표시한다", () => {
    profileState.phoneVerified = true;
    renderPage();

    expect(
      screen.getByText("서비스 알림은 마케팅 동의와 무관하게 발송됩니다."),
    ).toBeInTheDocument();
  });
});
