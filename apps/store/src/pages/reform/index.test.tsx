import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ReformPage from "@/pages/reform";

vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock("@/shared/lib/breakpoint-provider", () => ({
  useBreakpoint: () => ({ isMobile: false }),
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
  PageLayout: ({
    children,
    detail,
  }: {
    children: React.ReactNode;
    detail: React.ReactNode;
  }) => (
    <main>
      {detail}
      {children}
    </main>
  ),
}));

vi.mock("@/shared/ui/page-seo", () => ({
  PageSeo: () => null,
}));

vi.mock("@/shared/composite/utility-page", () => ({
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

vi.mock("@/shared/composite/order-summary-aside", () => ({
  OrderSummaryAside: () => null,
}));

vi.mock("@/shared/composite/shop-action-bar", () => ({
  ShopActionBar: () => null,
}));

vi.mock("@/shared/composite/tie-length-guide-accordion", () => ({
  TieLengthGuideAccordion: () => null,
}));

vi.mock("@/shared/composite/empty", () => ({
  Empty: ({ title }: { title: string }) => <p>{title}</p>,
}));

vi.mock("@/shared/ui/dialog", () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
}));

vi.mock("@/shared/ui-extended/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button disabled={disabled} onClick={onClick}>
      {children}
    </button>
  ),
}));

vi.mock("@/shared/ui/checkbox", () => ({
  Checkbox: ({ id }: { id?: string }) => <input id={id} type="checkbox" />,
}));

vi.mock("@/shared/ui/field", () => ({
  Field: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  FieldLabel: ({
    children,
    htmlFor,
  }: {
    children: React.ReactNode;
    htmlFor?: string;
  }) => <label htmlFor={htmlFor}>{children}</label>,
  FieldTitle: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
}));

vi.mock("@/shared/composite/bulk-apply-section", () => ({
  default: () => <div>bulk-apply-form</div>,
}));

vi.mock("@/features/reform", () => ({
  MobileReformSheet: () => null,
  TieItemCard: () => <div>tie-item-card</div>,
  toReformCartItems: () => [],
  toReformData: () => [],
  useUploadTieImages: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

vi.mock("@/entities/reform", () => ({
  calcTieCost: () => 0,
  useReformPricing: () => ({
    data: {
      REFORM_BASE_COST: 0,
      REFORM_SHIPPING_COST: 0,
      REFORM_WIDTH_COST: 0,
    },
  }),
}));

vi.mock("@/features/cart", () => ({
  useCart: () => ({
    addMultipleReformToCart: vi.fn(),
  }),
}));

vi.mock("@/shared/store/order", () => ({
  useOrderStore: () => ({
    setOrderItems: vi.fn(),
  }),
}));

vi.mock("@/shared/store/modal", () => ({
  useModalStore: () => ({
    alert: vi.fn(),
    confirm: vi.fn(),
  }),
}));

describe("ReformPage", () => {
  it("일괄 적용 안내 이미지 섹션을 렌더링하지 않는다", () => {
    render(<ReformPage />);

    expect(screen.queryByText("Bulk Apply")).not.toBeInTheDocument();
    expect(
      screen.queryByText("여러 개 맡겨도 어렵지 않아요"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("일괄 적용으로 한 번에 같은 요청 전달"),
    ).not.toBeInTheDocument();
  });

  it("폭수선 안내 이미지 placeholder 섹션을 렌더링하지 않는다", () => {
    render(<ReformPage />);

    expect(
      screen.queryByText("넥타이 폭, 지금 취향에 맞게"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("넓은 폭도 더 슬림하고 깔끔하게"),
    ).not.toBeInTheDocument();
  });
});
