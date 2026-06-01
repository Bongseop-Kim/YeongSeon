import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QuoteRequestDetailSection } from "./quote-request-detail-section";

const { detailHookMock, statusLogsHookMock, statusUpdateHookMock } = vi.hoisted(
  () => ({
    detailHookMock: vi.fn(),
    statusLogsHookMock: vi.fn(),
    statusUpdateHookMock: vi.fn(),
  }),
);

vi.mock("seed-design/ui/action-button", () => ({
  ActionButton: ({
    children,
    loading: _loading,
    ...props
  }: {
    children?: ReactNode;
    loading?: boolean;
  }) => <button {...props}>{children}</button>,
}));

vi.mock("seed-design/ui/alert-dialog", () => ({
  AlertDialogRoot: ({ children }: { children?: ReactNode }) => <>{children}</>,
  AlertDialogContent: ({ children }: { children?: ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogDescription: ({ children }: { children?: ReactNode }) => (
    <p>{children}</p>
  ),
  AlertDialogFooter: ({ children }: { children?: ReactNode }) => (
    <footer>{children}</footer>
  ),
  AlertDialogHeader: ({ children }: { children?: ReactNode }) => (
    <header>{children}</header>
  ),
  AlertDialogTitle: ({ children }: { children?: ReactNode }) => (
    <h2>{children}</h2>
  ),
  AlertDialogAction: ({
    children,
    loading: _loading,
    ...props
  }: {
    children?: ReactNode;
    loading?: boolean;
  }) => <button {...props}>{children}</button>,
}));

vi.mock("seed-design/ui/callout", () => ({
  Callout: ({ description }: { description?: ReactNode }) => (
    <div role="alert">{description}</div>
  ),
}));

vi.mock("seed-design/ui/text-field", () => ({
  TextField: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  TextFieldInput: (props: { [key: string]: unknown }) => <input {...props} />,
  TextFieldTextarea: (props: { [key: string]: unknown }) => (
    <textarea {...props} />
  ),
}));

vi.mock("@/lib/imagekit", () => ({
  IMAGEKIT_URL_ENDPOINT: "https://ik.imagekit.io/yeongseon/",
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
    detailHookMock.mockReset();
    statusLogsHookMock.mockReset();
    statusUpdateHookMock.mockReset();

    detailHookMock.mockReturnValue({
      data: {
        id: "quote-1",
        quoteNumber: "Q-001",
        date: "2026-03-15",
        status: "요청",
        quantity: 10,
        userId: "user-1",
        customerName: "홍길동",
        customerPhone: "01012345678",
        customerEmail: "user@example.com",
        contactName: "홍길동",
        businessName: "영선산업",
        contactMethod: "phone",
        contactValue: "01012345678",
        options: {},
        quotedAmount: null,
        quoteConditions: null,
        adminMemo: null,
        referenceImageUrls: [],
        additionalNotes: "",
        recipientName: "수령인",
        recipientPhone: "01098765432",
        shippingPostalCode: "12345",
        shippingAddress: "서울시 종로구 세종대로 1",
        shippingAddressDetail: "101호",
        deliveryMemo: null,
        deliveryRequest: "DELIVERY_REQUEST_3",
      },
      isLoading: false,
      error: null,
    });
    statusLogsHookMock.mockReturnValue({
      data: [],
      isFetching: false,
      error: null,
    });
    statusUpdateHookMock.mockReturnValue({
      updateStatus: vi.fn(),
      isUpdating: false,
      error: null,
      successMessage: null,
    });
  });

  it("배송요청 코드를 한글 레이블로 표시한다", () => {
    render(
      <MemoryRouter>
        <QuoteRequestDetailSection quoteRequestId="quote-1" />
      </MemoryRouter>,
    );

    expect(screen.getByText("택배함에 넣어 주세요.")).toBeInTheDocument();
    expect(screen.queryByText("DELIVERY_REQUEST_3")).not.toBeInTheDocument();
  });

  it("ImageKit https 참고 이미지만 링크로 표시한다", () => {
    detailHookMock.mockReturnValue({
      data: {
        ...detailHookMock().data,
        referenceImageUrls: [
          "https://ik.imagekit.io/yeongseon/quote/ref.jpg",
          "javascript:alert(1)",
          "https://example.com/ref.jpg",
        ],
      },
      isLoading: false,
      error: null,
    });

    render(
      <MemoryRouter>
        <QuoteRequestDetailSection quoteRequestId="quote-1" />
      </MemoryRouter>,
    );

    const image = screen.getByRole("img", { name: "견적 참고 이미지" });
    expect(image).toHaveAttribute(
      "src",
      "https://ik.imagekit.io/yeongseon/quote/ref.jpg",
    );
    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "https://ik.imagekit.io/yeongseon/quote/ref.jpg",
    );
    expect(
      screen.getAllByRole("img", { name: "견적 참고 이미지" }),
    ).toHaveLength(1);
  });
});
