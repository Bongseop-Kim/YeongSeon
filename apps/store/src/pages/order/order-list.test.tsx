import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import OrderListPage from "@/pages/order/order-list";
import { createOrderItemRowRaw } from "@/test/fixtures";
import { useAuthStore } from "@/shared/store/auth";
import { useSearchStore } from "@/shared/store/search";

const { fromMock, rpcMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
  rpcMock: vi.fn(),
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

vi.mock("@/shared/hooks/use-debounced-value", () => ({
  useDebouncedValue: (value: string) => value,
}));

vi.mock("@/shared/lib/supabase", () => ({
  supabase: {
    from: fromMock,
    rpc: rpcMock,
  },
}));

const createOrderListRowRaw = (
  overrides?: Partial<Record<string, unknown>>,
): Record<string, unknown> => ({
  id: "order-1",
  orderNumber: "ORD-001",
  date: "2026-03-15",
  status: "진행중",
  totalPrice: 23000,
  orderType: "sale",
  created_at: "2026-03-15T09:00:00Z",
  customerActions: [],
  ...overrides,
});

describe("OrderListPage", () => {
  beforeEach(() => {
    fromMock.mockReset();
    rpcMock.mockReset();
    rpcMock.mockResolvedValue({ data: [], error: null });
    useAuthStore.setState({
      initialized: true,
      user: { id: "user-1" } as never,
    });
    useSearchStore.setState((state) => ({
      ...state,
      config: {
        ...state.config,
        enabled: false,
        query: "",
        tabs: undefined,
      },
    }));
  });

  it("실제 주문 조회 경로에서 빈 주문이 제외된 결과만 렌더링한다", async () => {
    const listLimit = vi.fn().mockResolvedValue({
      data: [
        createOrderListRowRaw({
          id: "visible-order",
          orderNumber: "ORD-VISIBLE",
        }),
      ],
      error: null,
    });
    const listOrder = vi.fn(() => ({
      limit: listLimit,
    }));
    const listSelect = vi.fn(() => ({
      order: listOrder,
    }));
    const itemOrder = vi.fn().mockResolvedValue({
      data: [
        createOrderItemRowRaw({
          id: "visible-item",
          order_id: "visible-order",
        }),
      ],
      error: null,
    });
    const itemIn = vi.fn(() => ({
      order: itemOrder,
    }));
    const itemSelect = vi.fn(() => ({
      in: itemIn,
    }));

    fromMock.mockImplementation((table: string) => {
      if (table === "order_list_view") {
        return {
          select: listSelect,
        };
      }

      if (table === "order_item_view") {
        return {
          select: itemSelect,
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <OrderListPage />
        </QueryClientProvider>
      </MemoryRouter>,
    );

    expect(
      await screen.findByTestId("order-card-visible-order"),
    ).toBeInTheDocument();
    expect(screen.queryByText("ORD-CLAIMED")).not.toBeInTheDocument();
    expect(itemIn).toHaveBeenCalledWith("order_id", ["visible-order"]);
  });
});
