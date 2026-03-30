import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QuoteRequestDetailSection } from "./quote-request-detail-section";

const { showMock, detailHookMock, statusLogsHookMock, statusUpdateHookMock } =
  vi.hoisted(() => ({
    showMock: vi.fn(),
    detailHookMock: vi.fn(),
    statusLogsHookMock: vi.fn(),
    statusUpdateHookMock: vi.fn(),
  }));

vi.mock("@refinedev/core", () => ({
  useNavigation: () => ({ show: showMock }),
}));

vi.mock("@/features/quote-requests/api/quote-requests-query", () => ({
  useAdminQuoteRequestDetail: () => detailHookMock(),
  useAdminQuoteRequestStatusLogs: () => statusLogsHookMock(),
  useQuoteRequestFormState: () => ({
    formValues: {
      quotedAmount: null,
      quoteConditions: "",
      adminMemo: "",
      statusMemo: "",
    },
    setQuotedAmount: vi.fn(),
    setQuoteConditions: vi.fn(),
    setAdminMemo: vi.fn(),
    setStatusMemo: vi.fn(),
  }),
  useQuoteRequestStatusUpdate: () => statusUpdateHookMock(),
}));

vi.mock(
  "@/features/quote-requests/components/custom-order-options-detail",
  () => ({
    CustomOrderOptionsDetail: () => <div>custom-order-options</div>,
  }),
);

describe("QuoteRequestDetailSection", () => {
  beforeEach(() => {
    showMock.mockReset();
    detailHookMock.mockReset();
    statusLogsHookMock.mockReset();
    statusUpdateHookMock.mockReset();

    detailHookMock.mockReturnValue({
      detail: {
        id: "quote-1",
        quoteNumber: "Q-001",
        date: "2026-03-15",
        status: "접수",
        quantity: 10,
        userId: "user-1",
        customerName: "홍길동",
        customerPhone: "01012345678",
        customerEmail: "user@example.com",
        contactName: "홍길동",
        contactTitle: null,
        contactMethod: "phone",
        contactValue: "01012345678",
        options: [],
        referenceImageUrls: [],
        additionalNotes: null,
        recipientName: "수령인",
        recipientPhone: "01098765432",
        shippingPostalCode: "12345",
        shippingAddress: "서울시 종로구 세종대로 1",
        shippingAddressDetail: "101호",
        deliveryMemo: null,
        deliveryRequest: "DELIVERY_REQUEST_3",
      },
      refetch: vi.fn(),
      isLoading: false,
      error: null,
    });
    statusLogsHookMock.mockReturnValue({ logs: [] });
    statusUpdateHookMock.mockReturnValue({
      updateStatus: vi.fn(),
      isUpdating: false,
    });
  });

  it("배송요청 코드를 한글 레이블로 표시한다", () => {
    render(<QuoteRequestDetailSection />);

    expect(screen.getByText("택배함에 넣어 주세요.")).toBeInTheDocument();
    expect(screen.queryByText("DELIVERY_REQUEST_3")).not.toBeInTheDocument();
  });
});
