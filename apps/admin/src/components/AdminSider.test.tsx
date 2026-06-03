import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminSider } from "@/components/AdminSider";

const useIsMobileMock = vi.hoisted(() => vi.fn());

vi.mock("@/hooks/useIsMobile", () => ({
  useIsMobile: useIsMobileMock,
}));

vi.mock("@/providers/auth-provider", () => ({
  logoutAdmin: vi.fn(),
}));

function renderSider(path = "/orders") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AdminSider
        collapsed={false}
        mobileOpen={false}
        onCollapsedChange={() => undefined}
        onMobileOpenChange={() => undefined}
      />
    </MemoryRouter>,
  );
}

describe("AdminSider", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("선택된 메뉴도 다시 클릭할 수 있다", () => {
    useIsMobileMock.mockReturnValue(false);

    renderSider();

    expect(screen.getByRole("link", { name: "주문 관리" })).toHaveAttribute(
      "href",
      "/orders",
    );
  });

  it("local 환경에서는 sider를 파란색으로 표시한다", () => {
    vi.stubEnv("VITE_APP_ENV", "local");
    useIsMobileMock.mockReturnValue(false);

    const { container } = renderSider();
    const sider = container.querySelector(".adminSider");

    expect(sider).toHaveClass("adminSiderLocal");
  });
});
