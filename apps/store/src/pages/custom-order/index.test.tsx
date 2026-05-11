import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import OrderPage from "@/pages/custom-order";

vi.mock("@/shared/layout/main-layout", () => ({
  MainLayout: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  MainContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/shared/layout/page-layout", () => ({
  PageLayout: ({
    children,
    sidebar,
    breadcrumbs,
  }: {
    children: React.ReactNode;
    sidebar?: React.ReactNode;
    breadcrumbs?: { label: string; to?: string }[];
  }) => (
    <main>
      {breadcrumbs ? (
        <nav aria-label="breadcrumb">
          {breadcrumbs.map((item) => (
            <span key={item.label}>{item.label}</span>
          ))}
        </nav>
      ) : null}
      {sidebar}
      {children}
    </main>
  ),
}));

vi.mock("@/shared/ui/page-seo", () => ({
  PageSeo: () => null,
}));

vi.mock("@/shared/composite/order-summary-aside", () => ({
  OrderSummaryAside: () => <div data-testid="legacy-order-summary-aside" />,
}));

vi.mock("@/shared/composite/summary-card", () => ({
  SummaryCard: Object.assign(
    ({ children }: { children: React.ReactNode }) => (
      <section data-testid="summary-card">{children}</section>
    ),
    {
      Header: ({
        title,
        description,
      }: {
        title: React.ReactNode;
        description?: React.ReactNode;
      }) => (
        <header>
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </header>
      ),
      Section: ({ children }: { children: React.ReactNode }) => (
        <section data-testid="summary-card-section">{children}</section>
      ),
      Row: ({
        label,
        value,
      }: {
        label: React.ReactNode;
        value: React.ReactNode;
      }) => (
        <div>
          <span>{label}</span>
          <span>{value}</span>
        </div>
      ),
      NoticeList: ({
        label,
        items,
      }: {
        label?: React.ReactNode;
        items: React.ReactNode[];
      }) => (
        <div>
          {label ? <p>{label}</p> : null}
          <ul>
            {items.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
      ),
    },
  ),
}));

vi.mock("@/features/design", () => ({
  DesignImagePicker: () => null,
}));

vi.mock("@/shared/store/auth", () => ({
  useAuthStore: () => ({ user: { id: "user-1" } }),
}));

vi.mock("@/shared/lib/toast", () => ({
  toast: { error: vi.fn() },
}));

vi.mock("@/features/shipping", () => ({
  useShippingAddressPopup: () => ({
    selectedAddressId: null,
    selectedAddress: null,
    openShippingPopup: vi.fn(),
  }),
}));

vi.mock("@/entities/custom-order", () => ({
  usePricingConfig: () => ({ data: undefined }),
}));

vi.mock("@/features/custom-order", () => ({
  calculateTotalCost: () => ({
    sewingCost: 0,
    fabricCost: 0,
    totalCost: 0,
  }),
  useImageUpload: () => ({
    addExistingImages: vi.fn(),
  }),
  WIZARD_STEPS: [
    {
      id: "quantity",
      validate: () => undefined,
    },
  ],
  PACKAGE_PRESETS: [],
  useWizardStep: () => ({
    steps: [{ id: "quantity" }],
    currentStep: { id: "quantity" },
    currentStepIndex: 0,
    visitedSteps: new Set(["quantity"]),
    completedSteps: new Set(),
    isFirstStep: true,
    isLastStep: false,
    shouldShowStep: () => true,
    goToStep: vi.fn(),
    goNext: vi.fn(),
    goPrev: vi.fn(),
    forceGoToStep: vi.fn(),
    skipToStep: vi.fn(),
  }),
  useCustomOrderSubmit: () => ({
    handleSubmit: vi.fn(),
    isPending: false,
    isSubmitDisabled: false,
  }),
  useCustomOrderSummaryRows: () => [
    { id: "fabric", label: "원단", value: "원단 제공" },
    { id: "sewing", label: "봉제", value: "자동 · 기본" },
    { id: "quantity", label: "수량", value: "4개" },
  ],
  ProgressBar: () => <div>progress</div>,
  CustomOrderCostFooter: () => <div>cost footer</div>,
  WizardActionButtons: () => null,
  QuantityStep: () => <div>quantity step</div>,
  FabricStep: () => null,
  SewingStep: () => null,
  SpecStep: () => null,
  FinishingStep: () => null,
  AttachmentStep: () => null,
  ConfirmStep: () => null,
}));

describe("OrderPage", () => {
  it("공통 페이지 브래드크럼 항목을 PageLayout에 전달한다", () => {
    render(<OrderPage />);

    const breadcrumb = screen.getByRole("navigation", {
      name: "breadcrumb",
    });

    expect(within(breadcrumb).getByText("홈")).toBeInTheDocument();
    expect(within(breadcrumb).getByText("주문 제작")).toBeInTheDocument();
  });

  it("주문 요약 사이드바를 SummaryCard로 렌더링한다", () => {
    render(<OrderPage />);

    const summaryCard = screen.getByTestId("summary-card");

    expect(summaryCard).toBeInTheDocument();
    expect(
      screen.queryByTestId("legacy-order-summary-aside"),
    ).not.toBeInTheDocument();
    expect(within(summaryCard).getByText("주문 요약")).toBeInTheDocument();
    expect(within(summaryCard).getByText("원단")).toBeInTheDocument();
    expect(within(summaryCard).getByText("봉제")).toBeInTheDocument();
    expect(within(summaryCard).getByText("수량")).toBeInTheDocument();
    expect(within(summaryCard).getByText("cost footer")).toBeInTheDocument();
  });

  it("주문 요약 row와 비용 footer를 같은 SummaryCard 섹션에 렌더링한다", () => {
    render(<OrderPage />);

    const summaryCard = screen.getByTestId("summary-card");
    const sections = within(summaryCard).getAllByTestId("summary-card-section");

    expect(sections).toHaveLength(2);
    expect(within(sections[0]).getByText("수량")).toBeInTheDocument();
    expect(within(sections[0]).getByText("cost footer")).toBeInTheDocument();
    expect(within(sections[1]).getByText("유의사항")).toBeInTheDocument();
  });

  it("주문 요약 SummaryCard에 유의사항을 노출한다", () => {
    render(<OrderPage />);

    const summaryCard = screen.getByTestId("summary-card");

    expect(within(summaryCard).getByText("유의사항")).toBeInTheDocument();
    expect(
      within(summaryCard).getByText(
        "제주/도서산간 지역은 배송비 3,000원이 추가됩니다.",
      ),
    ).toBeInTheDocument();
    expect(
      within(summaryCard).getByText(
        "예상 제작 기간은 영업일 기준 28~42일입니다.",
      ),
    ).toBeInTheDocument();
    expect(
      within(summaryCard).getByText(
        "접수 이후에는 취소 및 환불이 불가능합니다.",
      ),
    ).toBeInTheDocument();
    expect(
      within(summaryCard).getByText(
        "접수 전 취소 시 택배비 3,000원을 제외하고 환불됩니다.",
      ),
    ).toBeInTheDocument();
  });
});
