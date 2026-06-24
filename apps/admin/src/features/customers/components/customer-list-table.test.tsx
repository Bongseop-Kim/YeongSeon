import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CustomerListTable } from "@/features/customers/components/customer-list-table";

const { useAdminCustomerTableMock, useCustomerTokenBalancesQueryMock } =
  vi.hoisted(() => ({
    useAdminCustomerTableMock: vi.fn(),
    useCustomerTokenBalancesQueryMock: vi.fn(),
  }));

vi.mock("@karrotmarket/react-monochrome-icon", () => ({
  IconCalendarLine: () => <span aria-hidden="true" />,
  IconChevronDownLine: () => <span aria-hidden="true" />,
  IconMagnifyingglassLine: () => <span aria-hidden="true" />,
}));

vi.mock("seed-design/ui/action-button", () => ({
  ActionButton: ({
    children,
    ...props
  }: {
    children?: ReactNode;
    [key: string]: unknown;
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
}));

vi.mock("@/features/customers/api/customers-query", () => ({
  CUSTOMER_PAGE_SIZE: 20,
  useAdminCustomerTable: useAdminCustomerTableMock,
  useCustomerTokenBalancesQuery: useCustomerTokenBalancesQueryMock,
}));

function CurrentPath() {
  const location = useLocation();

  return <output aria-label="현재 경로">{location.pathname}</output>;
}

describe("CustomerListTable", () => {
  beforeEach(() => {
    useAdminCustomerTableMock.mockReturnValue({
      data: {
        rows: [
          {
            id: "customer-1",
            name: "홍길동",
            phone: "010-1111-2222",
            email: "hong@example.com",
            role: "customer",
            isActive: true,
            createdAt: "2026-01-01T00:00:00.000Z",
          },
        ],
        total: 1,
      },
      isFetching: false,
      error: null,
    });
    useCustomerTokenBalancesQueryMock.mockReturnValue({
      data: [{ userId: "customer-1", balance: 3000 }],
      isLoading: false,
    });
  });

  it("고객 행 클릭 시 customers 상세 URL로 이동한다", () => {
    render(
      <MemoryRouter initialEntries={["/customers"]}>
        <CustomerListTable />
        <CurrentPath />
      </MemoryRouter>,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "홍길동 고객 상세 보기" }),
    );

    expect(screen.getByLabelText("현재 경로")).toHaveTextContent(
      "/customers/show/customer-1",
    );
  });
});
