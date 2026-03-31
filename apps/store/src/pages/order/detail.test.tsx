import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Order } from "@yeongseon/shared/types/view/order";
import { ROUTES } from "@/shared/constants/ROUTES";
import OrderDetailPage from "@/pages/order/detail";

const mockNavigate = vi.hoisted(() => vi.fn());
const { useOrderDetailMock, useConfirmPurchaseMock } = vi.hoisted(() => ({
  useOrderDetailMock: vi.fn(),
  useConfirmPurchaseMock: vi.fn(),
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
      <div data-testid="page-layout-sidebar">{sidebar}</div>
      <div data-testid="page-layout-content">{children}</div>
      <div data-testid="page-layout-action-bar">{actionBar}</div>
    </div>
  ),
}));

vi.mock("@/shared/composite/empty", () => ({
  Empty: ({ title, description }: { title: string; description?: string }) => (
    <div>
      <div>{title}</div>
      {description ? <div>{description}</div> : null}
    </div>
  ),
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
  useOrderDetail: () => useOrderDetailMock(),
  useConfirmPurchase: () => useConfirmPurchaseMock(),
}));

const createOrder = (overrides?: Partial<Order>): Order => ({
  id: "order-1",
  orderNumber: "ORD-001",
  date: "2026-03-15T09:00:00Z",
  status: "진행중",
  orderType: "sale",
  totalPrice: 10000,
  shippingInfo: {
    recipientName: "홍길동",
    recipientPhone: "01012345678",
    postalCode: "12345",
    address: "서울시 종로구 세종대로 1",
    addressDetail: "101호",
    deliveryMemo: null,
    deliveryRequest: null,
  },
  trackingInfo: null,
  confirmedAt: null,
  customerActions: [],
  items: [],
  ...overrides,
});

describe("OrderDetailPage", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    useOrderDetailMock.mockReset();
    useConfirmPurchaseMock.mockReset();

    useConfirmPurchaseMock.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
      error: null,
    });
    useOrderDetailMock.mockReturnValue({
      order: createOrder(),
      isLoading: false,
      isError: false,
      error: null,
      isNotFound: false,
      refetch: vi.fn(),
    });
  });

  it("주문 아이템이 없으면 중립 안내 문구와 이동 버튼을 표시한다", async () => {
    render(<OrderDetailPage />);

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
  });

  it("배송요청 코드를 한글 레이블로 표시한다", () => {
    useOrderDetailMock.mockReturnValue({
      order: createOrder({
        shippingInfo: {
          recipientName: "홍길동",
          recipientPhone: "01012345678",
          postalCode: "12345",
          address: "서울시 종로구 세종대로 1",
          addressDetail: "101호",
          deliveryMemo: null,
          deliveryRequest: "DELIVERY_REQUEST_4",
        },
        items: [
          {
            id: "item-1",
            type: "product",
            product: {
              id: 1,
              code: "P-001",
              name: "상품명",
              image: "",
              price: 10000,
              category: "3fold",
              color: "navy",
              pattern: "solid",
              material: "silk",
              likes: 0,
              info: "",
            },
            quantity: 1,
          },
        ],
      }),
      isLoading: false,
      isError: false,
      error: null,
      isNotFound: false,
      refetch: vi.fn(),
    });

    render(<OrderDetailPage />);

    expect(screen.getByText("배송 전에 연락 주세요.")).toBeInTheDocument();
    expect(screen.queryByText("DELIVERY_REQUEST_4")).not.toBeInTheDocument();
  });

  it("수선 주문의 현재 할 일 카드를 메인 영역에만 표시한다", () => {
    useOrderDetailMock.mockReturnValue({
      order: createOrder({
        orderType: "repair",
        status: "발송대기",
      }),
      isLoading: false,
      isError: false,
      error: null,
      isNotFound: false,
      refetch: vi.fn(),
    });

    render(<OrderDetailPage />);

    expect(screen.getByTestId("page-layout-content")).toHaveTextContent(
      "현재 할 일",
    );
    expect(screen.getByTestId("page-layout-sidebar")).not.toHaveTextContent(
      "현재 할 일",
    );
  });

  it("구매확정 가능 주문은 전용 섹션 제목과 액션 버튼을 함께 표시한다", async () => {
    useOrderDetailMock.mockReturnValue({
      order: createOrder({
        customerActions: ["confirm_purchase"],
      }),
      isLoading: false,
      isError: false,
      error: null,
      isNotFound: false,
      refetch: vi.fn(),
    });

    render(<OrderDetailPage />);

    expect(
      await screen.findByRole("heading", { name: "구매확정" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "구매확정" }),
    ).toBeInTheDocument();
  });
});
