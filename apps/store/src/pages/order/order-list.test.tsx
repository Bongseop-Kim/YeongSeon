import { render, screen } from "@testing-library/react";
import { describe, expect, it, beforeEach, vi } from "vitest";
import type { Order } from "@yeongseon/shared/types/view/order";
import { createProductOrderItem } from "@yeongseon/shared/test/fixtures";
import OrderListPage from "@/pages/order/order-list";

const mockNavigate = vi.hoisted(() => vi.fn());
const mockUseOrders = vi.hoisted(() => vi.fn());
const mockUseRefundableTokenOrdersQuery = vi.hoisted(() => vi.fn());
const mockUseSearchTabs = vi.hoisted(() => vi.fn());

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");

  return {
    ...actual,
    useNavigate: () => mockNavigate,
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
  PageLayout: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/shared/composite/utility-list-page-shell", () => ({
  UtilityListPageShell: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/shared/composite/empty", () => ({
  Empty: ({ title, description }: { title: string; description: string }) => (
    <div>
      <p>{title}</p>
      <p>{description}</p>
    </div>
  ),
}));

vi.mock("@/shared/composite/status-badge", () => ({
  OrderStatusBadge: ({ status }: { status: string }) => <span>{status}</span>,
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

vi.mock("@/shared/composite/utility-page", () => ({
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
}));

vi.mock("@/shared/composite/order-item-card", () => ({
  OrderItemCard: ({ item }: { item: { id: string } }) => (
    <div data-testid={`order-item-${item.id}`}>{item.id}</div>
  ),
}));

vi.mock("@/features/order", () => ({
  TokenRefundAction: () => <div>token-refund-action</div>,
}));

vi.mock("@/entities/order", () => ({
  useOrders: mockUseOrders,
}));

vi.mock("@/entities/my-page", () => ({
  useRefundableTokenOrdersQuery: mockUseRefundableTokenOrdersQuery,
}));

vi.mock("@/shared/hooks/use-search-tabs", () => ({
  useSearchTabs: mockUseSearchTabs,
}));

vi.mock("@/shared/hooks/use-debounced-value", () => ({
  useDebouncedValue: (value: string) => value,
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

describe("OrderListPage", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockUseSearchTabs.mockReturnValue("전체");
    mockUseRefundableTokenOrdersQuery.mockReturnValue({ data: [] });
    mockUseOrders.mockReturnValue({
      data: [
        createOrder({ id: "visible-order", orderNumber: "ORD-VISIBLE" }),
        createOrder({
          id: "claimed-order",
          orderNumber: "ORD-CLAIMED",
          items: [],
        }),
      ],
      isLoading: false,
      error: null,
    });
  });

  it("클레임으로 아이템이 0개가 된 주문 카드는 목록에서 숨긴다", () => {
    render(<OrderListPage />);

    expect(screen.getByTestId("order-card-visible-order")).toBeInTheDocument();
    expect(
      screen.queryByTestId("order-card-claimed-order"),
    ).not.toBeInTheDocument();
  });
});
