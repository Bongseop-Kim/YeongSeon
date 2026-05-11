import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type * as ReactRouter from "react-router-dom";

import SampleOrderPage from "@/pages/sample-order";

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouter>();
  return {
    ...actual,
    useNavigate: () => vi.fn(),
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
    breadcrumbs,
  }: {
    children: React.ReactNode;
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
      {children}
    </main>
  ),
}));

vi.mock("@/shared/ui/page-seo", () => ({
  PageSeo: () => null,
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
      Section: ({ children }: { children: React.ReactNode }) => (
        <section data-testid="summary-card-section">{children}</section>
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
          <span>{label}</span>
          <span>{value}</span>
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

vi.mock("@/shared/composite/payment-action-bar", () => ({
  PaymentActionBar: () => null,
}));

vi.mock("@/shared/store/auth", () => ({
  useAuthStore: () => ({ user: { id: "user-1" } }),
}));

vi.mock("@/shared/lib/toast", () => ({
  toast: { error: vi.fn() },
}));

vi.mock("@/shared/lib/analytics", () => ({
  analytics: { track: vi.fn() },
}));

vi.mock("@/features/design", () => ({
  DesignImagePicker: () => null,
}));

vi.mock("@/features/custom-order", () => ({
  useImageUpload: () => ({
    uploadedImages: [],
    isUploading: false,
    uploadFile: vi.fn(),
    removeImage: vi.fn(),
    addExistingImages: vi.fn(),
    getImageRefs: () => [],
  }),
  ImageUpload: () => null,
}));

vi.mock("@/entities/custom-order", () => ({
  usePricingConfig: () => ({
    data: {
      SAMPLE_SEWING_COST: 11000,
      SAMPLE_FABRIC_PRINTING_COST: 22000,
      SAMPLE_FABRIC_YARN_DYED_COST: 33000,
      SAMPLE_FABRIC_AND_SEWING_PRINTING_COST: 44000,
      SAMPLE_FABRIC_AND_SEWING_YARN_DYED_COST: 55000,
      REFORM_SHIPPING_COST: 4200,
    },
    isError: false,
  }),
}));

describe("SampleOrderPage", () => {
  it("주문 요약 유의사항에 가격 설정의 배송비를 노출한다", () => {
    render(<SampleOrderPage />);

    const summaryCard = screen.getByTestId("summary-card");

    expect(within(summaryCard).getByText("유의사항")).toBeInTheDocument();
    expect(
      within(summaryCard).getByText(
        "제주/도서산간 지역은 배송비 4,200원이 추가됩니다.",
      ),
    ).toBeInTheDocument();
    expect(
      within(summaryCard).getByText(
        "접수 전 취소 시 택배비 4,200원을 제외하고 환불됩니다.",
      ),
    ).toBeInTheDocument();
  });
});
