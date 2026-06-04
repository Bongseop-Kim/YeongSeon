import { render, screen } from "@testing-library/react";
import { within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
    sidebar,
    breadcrumbs,
  }: {
    children: React.ReactNode;
    detail: React.ReactNode;
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
      Section: ({
        title,
        children,
      }: {
        title?: React.ReactNode;
        children: React.ReactNode;
      }) => (
        <section>
          {title ? <p>{title}</p> : null}
          {children}
        </section>
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
      }: {
        label: React.ReactNode;
        value: React.ReactNode;
      }) => (
        <div>
          <strong>{label}</strong>
          <strong>{value}</strong>
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

vi.mock("@/shared/composite/shop-action-bar", () => ({
  ShopActionBar: () => null,
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

vi.mock("@/shared/ui/data-table", () => ({
  DataTable: ({
    headers,
    data,
  }: {
    headers: string[];
    data: Record<string, string | number>[];
  }) => (
    <table>
      <thead>
        <tr>
          {headers.map((header) => (
            <th key={header}>{header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, index) => (
          <tr key={index}>
            {headers.map((header) => (
              <td key={header}>{row[header]}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
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
      baseCost: 0,
      shippingCost: 4200,
      widthReformCost: 0,
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
  it("공통 페이지 브래드크럼 항목을 PageLayout에 전달한다", () => {
    render(<ReformPage />);

    const breadcrumb = screen.getByRole("navigation", {
      name: "breadcrumb",
    });

    expect(within(breadcrumb).getByText("홈")).toBeInTheDocument();
    expect(
      within(breadcrumb).getByText("넥타이 수선·리폼"),
    ).toBeInTheDocument();
  });

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

  it("리폼 결제 예상 금액을 SummaryCard로 렌더링한다", () => {
    render(<ReformPage />);

    expect(screen.getByTestId("summary-card")).toBeInTheDocument();
    expect(
      screen.queryByTestId("legacy-order-summary-aside"),
    ).not.toBeInTheDocument();
    expect(screen.getByText("결제 예상 금액")).toBeInTheDocument();
    expect(screen.getByText("상품 금액")).toBeInTheDocument();
    expect(screen.getByText("배송비")).toBeInTheDocument();
    expect(screen.getByText("총 결제 금액")).toBeInTheDocument();
  });

  it("리폼 유의사항을 SummaryCard 안에서 상시 노출한다", () => {
    render(<ReformPage />);

    const summaryCard = screen.getByTestId("summary-card");

    expect(screen.getByText("유의사항")).toBeInTheDocument();
    expect(
      screen.getByText("제주/도서산간 지역은 배송비 4,200원이 추가됩니다."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("예상 수선 기간은 영업일 기준 7~14일입니다."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("접수 전 취소 시 택배비 4,200원을 제외하고 환불됩니다."),
    ).toBeInTheDocument();
    expect(
      within(summaryCard).getByText("내게 맞는 넥타이 길이"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "내게 맞는 넥타이 길이" }),
    ).toBeInTheDocument();
  });

  it("키별 넥타이 길이 가이드를 SummaryCard에서 펼쳐 렌더링한다", async () => {
    const user = userEvent.setup();
    render(<ReformPage />);

    const summaryCard = screen.getByTestId("summary-card");
    const trigger = within(summaryCard).getByRole("button", {
      name: "내게 맞는 넥타이 길이",
    });

    expect(trigger).toHaveAttribute("aria-expanded", "false");
    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(within(summaryCard).getByText("키")).toBeInTheDocument();
    expect(within(summaryCard).getByText("권장 길이")).toBeInTheDocument();
    expect(within(summaryCard).getByText("170cm")).toBeInTheDocument();
    expect(within(summaryCard).getByText("49cm")).toBeInTheDocument();
  });
});
