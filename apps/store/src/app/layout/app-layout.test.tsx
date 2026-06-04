import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AppLayout from "@/app/layout/app-layout";
import { ROUTES } from "@/shared/constants/ROUTES";

const breakpointState = vi.hoisted(() => ({
  isMobile: false,
}));
const mockUseCart = vi.hoisted(() => vi.fn());
const mockUseAuthStore = vi.hoisted(() => vi.fn());
const mockUseSignOut = vi.hoisted(() => vi.fn());
const mockUsePopup = vi.hoisted(() => vi.fn());
const mockMutateAsync = vi.hoisted(() => vi.fn());
const mockOpenPopup = vi.hoisted(() => vi.fn());

vi.mock("@/app/router", () => ({
  default: () => <div>router outlet</div>,
}));

vi.mock("@/app/layout/menu-sheet", () => ({
  default: () => <div data-testid="menu-sheet" />,
}));

vi.mock("@/shared/lib/breakpoint-provider", () => ({
  useBreakpoint: () => ({
    isMobile: breakpointState.isMobile,
  }),
}));

vi.mock("@/features/cart", () => ({
  useCart: mockUseCart,
}));

vi.mock("@/shared/store/auth", () => ({
  useAuthStore: mockUseAuthStore,
}));

vi.mock("@/entities/auth", () => ({
  useSignOut: mockUseSignOut,
}));

vi.mock("@/shared/hooks/usePopup", () => ({
  usePopup: mockUsePopup,
}));

function renderAppLayout(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AppLayout />
    </MemoryRouter>,
  );
}

describe("AppLayout footer rendering", () => {
  beforeEach(() => {
    breakpointState.isMobile = false;
    mockMutateAsync.mockReset();
    mockOpenPopup.mockReset();
    mockUseCart.mockReturnValue({
      totalItems: 0,
    });
    mockUseAuthStore.mockReturnValue({
      user: null,
    });
    mockUseSignOut.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    });
    mockUsePopup.mockReturnValue({
      openPopup: mockOpenPopup,
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("local 환경에서는 header를 파란색으로 표시한다", () => {
    vi.stubEnv("VITE_APP_ENV", "local");

    renderAppLayout(ROUTES.HOME);

    expect(screen.getByRole("banner")).toHaveClass("bg-blue-950");
  });

  it("모바일 서브페이지에서도 footer 노드를 유지하고 숨김 처리한다", () => {
    breakpointState.isMobile = true;

    renderAppLayout(ROUTES.SHOP);

    const footer = screen.getByRole("contentinfo");

    expect(footer).toHaveAttribute("data-mobile", "true");
    expect(footer).toHaveAttribute("data-hidden", "true");
    expect(footer).toHaveClass("hidden");
  });

  it("모바일 홈에서는 footer를 표시한다", () => {
    breakpointState.isMobile = true;

    renderAppLayout(ROUTES.HOME);

    const footer = screen.getByRole("contentinfo");

    expect(footer).toHaveAttribute("data-hidden", "false");
    expect(footer).not.toHaveClass("hidden");
  });

  it("header 숨김 경로에서는 footer도 렌더링하지 않는다", () => {
    renderAppLayout(ROUTES.PRIVACY_POLICY);

    expect(screen.queryByRole("contentinfo")).not.toBeInTheDocument();
  });

  it("CTA 없는 모바일 서브페이지에서는 카카오톡 플로팅 버튼을 기본 위치에 둔다", () => {
    breakpointState.isMobile = true;

    renderAppLayout(ROUTES.SHOP);

    expect(
      screen.getByRole("button", { name: "카카오톡 채널 채팅하기" }),
    ).toHaveClass("bottom-5");
  });

  it("하단 CTA가 있는 모바일 페이지에서는 카카오톡 플로팅 버튼을 CTA 위로 올린다", () => {
    breakpointState.isMobile = true;

    renderAppLayout(`${ROUTES.SHOP}/product-1`);

    expect(
      screen.getByRole("button", { name: "카카오톡 채널 채팅하기" }),
    ).toHaveClass("bottom-[calc(env(safe-area-inset-bottom,0px)+5.75rem)]");
  });

  it("design 페이지에서는 카카오톡 플로팅 버튼을 렌더링하지 않는다", () => {
    renderAppLayout(ROUTES.DESIGN);

    expect(
      screen.queryByRole("button", { name: "카카오톡 채널 채팅하기" }),
    ).not.toBeInTheDocument();
  });
});
