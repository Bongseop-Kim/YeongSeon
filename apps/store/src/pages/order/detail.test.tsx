import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ROUTES } from "@/shared/constants/ROUTES";
import OrderDetailPage from "@/pages/order/detail";
import { useAuthStore } from "@/shared/store/auth";

const mockNavigate = vi.hoisted(() => vi.fn());
const { fromMock, rpcMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
  rpcMock: vi.fn(),
}));

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

vi.mock("@/shared/lib/supabase", () => ({
  supabase: {
    from: fromMock,
    rpc: rpcMock,
  },
}));

const createOrderDetailRowRaw = (
  overrides?: Partial<Record<string, unknown>>,
): Record<string, unknown> => ({
  id: "order-1",
  orderNumber: "ORD-001",
  date: "2026-03-15",
  status: "진행중",
  totalPrice: 10000,
  orderType: "sale",
  courierCompany: null,
  trackingNumber: null,
  shippedAt: null,
  deliveredAt: null,
  confirmedAt: null,
  created_at: "2026-03-15T09:00:00Z",
  recipientName: null,
  recipientPhone: null,
  shippingAddress: null,
  shippingAddressDetail: null,
  shippingPostalCode: null,
  deliveryMemo: null,
  deliveryRequest: null,
  customerActions: [],
  ...overrides,
});

describe("OrderDetailPage", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    fromMock.mockReset();
    rpcMock.mockReset();
    rpcMock.mockResolvedValue({ error: null });
    useAuthStore.setState({
      initialized: true,
      user: { id: "user-1" } as never,
    });
  });

  it("주문 아이템이 없으면 실제 상세 조회 경로를 거쳐 중립 안내 문구와 이동 버튼을 표시한다", async () => {
    const detailMaybeSingle = vi
      .fn()
      .mockResolvedValue({ data: createOrderDetailRowRaw(), error: null });
    const detailEq = vi.fn(() => ({
      maybeSingle: detailMaybeSingle,
    }));
    const detailSelect = vi.fn(() => ({
      eq: detailEq,
    }));
    const itemOrder = vi.fn().mockResolvedValue({ data: [], error: null });
    const itemEq = vi.fn(() => ({
      order: itemOrder,
    }));
    const itemSelect = vi.fn(() => ({
      eq: itemEq,
    }));

    fromMock.mockImplementation((table: string) => {
      if (table === "order_detail_view") {
        return {
          select: detailSelect,
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
        mutations: {
          retry: false,
        },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <OrderDetailPage />
      </QueryClientProvider>,
    );

    expect(
      await screen.findByText((content) =>
        content.includes("표시할 주문 상품이 없습니다."),
      ),
    ).toBeInTheDocument();

    const button = screen.getByRole("button", {
      name: "클레임 목록에서 확인하세요.",
    });

    fireEvent.click(button);

    expect(mockNavigate).toHaveBeenCalledWith(ROUTES.CLAIM_LIST);
    expect(detailEq).toHaveBeenCalledWith("id", "order-1");
    expect(itemEq).toHaveBeenCalledWith("order_id", "order-1");
  });
});
