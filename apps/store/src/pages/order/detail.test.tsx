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
        <div>
          <span>{label}</span>
          <span>{value}</span>
        </div>
      ),
      Total: ({
        label,
        value,
        compact,
        className,
        valueClassName,
      }: {
        label: React.ReactNode;
        value: React.ReactNode;
        compact?: boolean;
        className?: string;
        valueClassName?: string;
      }) => (
        <div
          data-testid="summary-card-total"
          data-compact={compact ? "true" : "false"}
          data-class-name={className ?? ""}
          data-value-class-name={valueClassName ?? ""}
        >
          <strong>{label}</strong>
          <strong>{value}</strong>
        </div>
      ),
    },
  ),
}));

vi.mock("@/shared/composite/utility-page", () => ({
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
  RepairAddressRows: () => (
    <div data-testid="repair-address-rows">repair-address-rows</div>
  ),
  RepairAddressCopyButton: () => <button>주소 복사</button>,
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

  it("결제 정보를 SummaryCard로 렌더링한다", () => {
    render(<OrderDetailPage />);

    expect(screen.getByTestId("summary-card")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "결제 정보" }),
    ).toBeInTheDocument();
    expect(screen.getByText("배송비")).toBeInTheDocument();
    expect(screen.getByText("총 결제 금액")).toBeInTheDocument();
    expect(screen.getByText("10,000원")).toBeInTheDocument();
    expect(screen.getByTestId("summary-card-total")).toHaveAttribute(
      "data-value-class-name",
      "",
    );
  });

  it("토큰 주문 결제 정보는 배송비 row가 없어도 Total 상단 border를 중복 표시하지 않는다", () => {
    useOrderDetailMock.mockReturnValue({
      order: createOrder({
        orderType: "token",
        shippingInfo: null,
      }),
      isLoading: false,
      isError: false,
      error: null,
      isNotFound: false,
      refetch: vi.fn(),
    });

    render(<OrderDetailPage />);

    expect(screen.queryByText("배송비")).not.toBeInTheDocument();
    expect(screen.getByTestId("summary-card-total")).toHaveAttribute(
      "data-compact",
      "true",
    );
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

    expect(
      screen.getByRole("heading", { name: "현재 할 일" }),
    ).toBeInTheDocument();
    expect(screen.getByText("수선품 보내실 곳")).toBeInTheDocument();
    expect(screen.getByTestId("repair-address-rows")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "송장번호 등록하기" }),
    ).toBeInTheDocument();
  });

  it("수선 주문의 배송 추적 섹션이 보이면 현재 할 일 카드에 같은 추적 정보를 중복 표시하지 않는다", () => {
    useOrderDetailMock.mockReturnValue({
      order: createOrder({
        orderType: "repair",
        status: "배송중",
        trackingInfo: {
          courierCompany: "cj",
          trackingNumber: "1234567890",
          shippedAt: "2026-03-15T09:00:00Z",
          deliveredAt: null,
          companyCourierCompany: null,
          companyTrackingNumber: null,
          companyShippedAt: null,
        },
      }),
      isLoading: false,
      isError: false,
      error: null,
      isNotFound: false,
      refetch: vi.fn(),
    });

    render(<OrderDetailPage />);

    expect(
      screen.queryByRole("heading", { name: "현재 할 일" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "배송 추적" }),
    ).toBeInTheDocument();
    expect(screen.getByText("1234567890")).toBeInTheDocument();
  });

  it("수선 주문에 업체 발송 정보가 있으면 별도 섹션을 표시한다", () => {
    useOrderDetailMock.mockReturnValue({
      order: createOrder({
        orderType: "repair",
        status: "배송중",
        trackingInfo: {
          courierCompany: null,
          trackingNumber: null,
          shippedAt: null,
          deliveredAt: null,
          companyCourierCompany: "hanjin",
          companyTrackingNumber: "COMPANY-123",
          companyShippedAt: "2026-03-16T10:00:00Z",
        },
      }),
      isLoading: false,
      isError: false,
      error: null,
      isNotFound: false,
      refetch: vi.fn(),
    });

    render(<OrderDetailPage />);

    expect(
      screen.getByRole("heading", { name: "배송 추적" }),
    ).toBeInTheDocument();
    expect(screen.getByText("업체 발송 정보")).toBeInTheDocument();
    expect(screen.getByText("COMPANY-123")).toBeInTheDocument();
  });

  it("수선 주문의 고객 배송조회 링크와 업체 배송조회 링크를 서로 다른 접근성 이름으로 노출한다", () => {
    useOrderDetailMock.mockReturnValue({
      order: createOrder({
        orderType: "repair",
        status: "배송중",
        trackingInfo: {
          courierCompany: "cj",
          trackingNumber: "1234567890",
          shippedAt: "2026-03-15T09:00:00Z",
          deliveredAt: null,
          companyCourierCompany: "hanjin",
          companyTrackingNumber: "COMPANY-123",
          companyShippedAt: "2026-03-16T10:00:00Z",
        },
      }),
      isLoading: false,
      isError: false,
      error: null,
      isNotFound: false,
      refetch: vi.fn(),
    });

    render(<OrderDetailPage />);

    expect(
      screen.getByRole("link", { name: "고객 배송 정보 배송조회" }),
    ).toHaveAttribute("href");
    expect(
      screen.getByRole("link", { name: "업체 발송 정보 배송조회" }),
    ).toHaveAttribute("href");
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

  it("샘플 주문의 제작 옵션은 결제 화면과 같은 주문 사양 확인 카드로 표시한다", () => {
    useOrderDetailMock.mockReturnValue({
      order: createOrder({
        orderType: "sample",
        totalPrice: 58000,
        items: [
          {
            id: "sample-item-1",
            type: "sample",
            quantity: 1,
            sampleData: {
              sampleType: "fabric_and_sewing",
              options: {
                fabricType: "POLY",
                designType: "PRINTING",
                tieType: "AUTO",
                interlining: "WOOL",
              },
              pricing: {
                totalCost: 58000,
              },
              referenceImageUrls: ["https://example.com/ref.jpg"],
              additionalNotes: "로고 색상 확인 필요",
            },
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

    expect(
      screen.getByRole("heading", { name: "샘플 제작 옵션" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "주문 사양 확인" }),
    ).toBeInTheDocument();
    expect(screen.getByText("원단 + 봉제 샘플")).toBeInTheDocument();
    expect(screen.getByText("폴리 · 납염")).toBeInTheDocument();
    expect(screen.getByText("자동 타이")).toBeInTheDocument();
    expect(screen.getByText("울 심지")).toBeInTheDocument();
    expect(screen.getByText("1개 첨부")).toBeInTheDocument();
    expect(screen.getAllByText("58,000원")).toHaveLength(2);
    expect(screen.getByText("₩58,000")).toBeInTheDocument();
    expect(screen.queryByText("custom-order-options")).not.toBeInTheDocument();
  });
});
