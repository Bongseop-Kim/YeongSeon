import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Order } from "@yeongseon/shared/types/view/order";
import { createProductOrderItem } from "@yeongseon/shared/test/fixtures";
import { ROUTES } from "@/shared/constants/ROUTES";
import OrderDetailPage from "@/pages/order/detail";

const mockNavigate = vi.hoisted(() => vi.fn());
const mockUseOrderDetail = vi.hoisted(() => vi.fn());
const mockUseConfirmPurchase = vi.hoisted(() => vi.fn());

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");

  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: "order-1" }),
  };
});

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
    actionBar,
  }: {
    children: React.ReactNode;
    sidebar?: React.ReactNode;
    actionBar?: React.ReactNode;
  }) => (
    <div>
      <div>{sidebar}</div>
      <div>{children}</div>
      <div>{actionBar}</div>
    </div>
  ),
}));

vi.mock("@/shared/composite/empty", () => ({
  Empty: ({ title }: { title: string }) => <div>{title}</div>,
}));

vi.mock("@/shared/composite/status-badge", () => ({
  OrderStatusBadge: ({ status }: { status: string }) => <span>{status}</span>,
}));

vi.mock("@/shared/composite/order-item-card", () => ({
  OrderItemCard: ({ item }: { item: { id: string } }) => <div>{item.id}</div>,
}));

vi.mock("@/shared/composite/custom-order-options-section", () => ({
  CustomOrderOptionsSection: () => <div>custom-order-options</div>,
}));

vi.mock("@/shared/composite/utility-page", () => ({
  UtilityKeyValueRow: ({
    label,
    value,
  }: {
    label: string;
    value: React.ReactNode;
  }) => (
    <div>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  ),
  UtilityPageAside: ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <aside>
      <h2>{title}</h2>
      {children}
    </aside>
  ),
  UtilityPageIntro: ({
    title,
    description,
    meta,
  }: {
    title: string;
    description: string;
    meta?: React.ReactNode;
  }) => (
    <section>
      <h1>{title}</h1>
      <p>{description}</p>
      <div>{meta}</div>
    </section>
  ),
  UtilityPageSection: ({
    title,
    description,
    children,
  }: {
    title: string;
    description?: string;
    children: React.ReactNode;
  }) => (
    <section>
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
      {children}
    </section>
  ),
}));

vi.mock("@/shared/ui/separator", () => ({
  Separator: () => <hr />,
}));

vi.mock("@/shared/ui-extended/button", () => ({
  Button: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => <button onClick={onClick}>{children}</button>,
}));

vi.mock("@/features/order", () => ({
  RepairShippingAddressBanner: () => <div>repair-shipping-banner</div>,
}));

vi.mock("@/entities/order", () => ({
  useOrderDetail: mockUseOrderDetail,
  useConfirmPurchase: mockUseConfirmPurchase,
}));

const createOrder = (overrides?: Partial<Order>): Order => ({
  id: "order-1",
  orderNumber: "ORD-001",
  date: "2026-03-15",
  status: "진행중",
  orderType: "sale",
  items: [createProductOrderItem()],
  totalPrice: 10000,
  shippingInfo: null,
  trackingInfo: null,
  confirmedAt: null,
  customerActions: [],
  ...overrides,
});

describe("OrderDetailPage", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockUseConfirmPurchase.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
      error: null,
    });
    mockUseOrderDetail.mockReturnValue({
      order: createOrder({ items: [] }),
      isLoading: false,
      isError: false,
      error: null,
      isNotFound: false,
      refetch: vi.fn(),
    });
  });

  it("주문 아이템이 없으면 클레임 목록 안내를 표시하고 이동 버튼을 제공한다", () => {
    render(<OrderDetailPage />);

    expect(
      screen.getByText((content) =>
        content.includes("모든 상품이 클레임 처리 중입니다."),
      ),
    ).toBeInTheDocument();

    const button = screen.getByRole("button", {
      name: "클레임 목록에서 확인하세요.",
    });

    fireEvent.click(button);

    expect(mockNavigate).toHaveBeenCalledWith(ROUTES.CLAIM_LIST);
  });
});
