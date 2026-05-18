import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import MypagePage from "@/pages/my-page";

const mockNavigate = vi.hoisted(() => vi.fn());

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");

  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("@/entities/auth", () => ({
  useSignOut: () => ({
    mutate: vi.fn(),
  }),
}));

vi.mock("@/entities/my-page", () => ({
  profileKeys: {
    all: ["profile"],
  },
  useProfile: () => ({
    data: {
      name: "홍길동",
      email: "user@example.com",
      phone: "01012345678",
      phoneVerified: true,
      notificationEnabled: false,
      marketingConsent: { kakaoSms: false },
    },
    isLoading: false,
  }),
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

vi.mock("@/shared/composite/ad-panel", () => ({
  AdPanel: () => <div>프로모션 패널</div>,
}));

vi.mock("@/shared/composite/summary-card", () => ({
  SummaryCard: Object.assign(
    ({ children }: { children: React.ReactNode }) => (
      <section data-testid="summary-card">{children}</section>
    ),
    {
      Header: ({ title }: { title: React.ReactNode }) => <h2>{title}</h2>,
      Section: ({ children }: { children: React.ReactNode }) => (
        <div>{children}</div>
      ),
      Row: ({
        label,
        value,
      }: {
        label: React.ReactNode;
        value: React.ReactNode;
      }) => (
        <div data-testid="summary-card-row">
          <span>{label}</span>
          <span>{value}</span>
        </div>
      ),
    },
  ),
}));

vi.mock("@/shared/composite/utility-page", () => ({
  UtilityLinkList: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  UtilityLinkRow: ({ label }: { label: string }) => <button>{label}</button>,
  UtilityPageIntro: ({
    title,
    description,
    actions,
    meta,
  }: {
    title: string;
    description?: string;
    actions?: React.ReactNode;
    meta?: React.ReactNode;
  }) => (
    <section>
      <h1>{title}</h1>
      {description ? <p>{description}</p> : null}
      {actions}
      {meta}
    </section>
  ),
  UtilityPageSection: ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  ),
  UtilityStatList: () => <div data-testid="utility-stat-list" />,
}));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MypagePage />
    </QueryClientProvider>,
  );
}

describe("MypagePage", () => {
  it("현재 상태 항목을 SummaryCard row로 좌우 배치한다", () => {
    renderPage();

    expect(
      screen.getByRole("heading", { name: "현재 상태" }),
    ).toBeInTheDocument();
    expect(screen.getAllByTestId("summary-card")).toHaveLength(1);
    expect(screen.getAllByTestId("summary-card-row")).toHaveLength(3);
    expect(screen.queryByTestId("utility-stat-list")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "프로모션" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("프로모션 패널")).toBeInTheDocument();
  });
});
