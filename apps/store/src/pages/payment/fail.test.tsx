import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PaymentFailPage from "@/pages/payment/fail";
import { ROUTES } from "@/shared/constants/ROUTES";

const mockNavigate = vi.hoisted(() => vi.fn());
const searchParamsRef = vi.hoisted(() => ({
  current: new URLSearchParams(),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");

  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [searchParamsRef.current],
  };
});

vi.mock("@/shared/layout/main-layout", () => ({
  MainLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  MainContent: ({ children }: { children: ReactNode }) => (
    <main>{children}</main>
  ),
}));

describe("PaymentFailPage", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    searchParamsRef.current = new URLSearchParams();
  });

  it("returnTo가 없으면 주문서로 replace 이동한다", () => {
    render(<PaymentFailPage />);

    fireEvent.click(screen.getByRole("button", { name: "주문서로 돌아가기" }));

    expect(mockNavigate).toHaveBeenCalledWith(ROUTES.ORDER_FORM, {
      replace: true,
    });
  });

  it.each([
    [ROUTES.CUSTOM_ORDER, "주문제작으로 돌아가기"],
    [ROUTES.SAMPLE_ORDER, "샘플 주문으로 돌아가기"],
  ])(
    "허용된 returnTo(%s)가 있으면 해당 경로로 replace 이동한다",
    (route, label) => {
      searchParamsRef.current = new URLSearchParams({
        returnTo: route,
      });

      render(<PaymentFailPage />);

      fireEvent.click(screen.getByRole("button", { name: label }));

      expect(mockNavigate).toHaveBeenCalledWith(route, {
        replace: true,
      });
    },
  );

  it("허용되지 않은 returnTo는 주문서로 fallback 후 replace 이동한다", () => {
    searchParamsRef.current = new URLSearchParams({
      returnTo: "/external",
    });

    render(<PaymentFailPage />);

    fireEvent.click(screen.getByRole("button", { name: "주문서로 돌아가기" }));

    expect(mockNavigate).toHaveBeenCalledWith(ROUTES.ORDER_FORM, {
      replace: true,
    });
  });
});
