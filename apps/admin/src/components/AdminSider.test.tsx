import { render, screen } from "@testing-library/react";
import type { CSSProperties, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { AdminSider } from "@/components/AdminSider";

const useMenuMock = vi.hoisted(() => vi.fn());
const useLinkMock = vi.hoisted(() => vi.fn());
const useIsMobileMock = vi.hoisted(() => vi.fn());

vi.mock("@/hooks/useIsMobile", () => ({
  useIsMobile: useIsMobileMock,
}));

vi.mock("@refinedev/core", async () => {
  const { Fragment } = await import("react");

  return {
    CanAccess: ({ children }: { children: ReactNode }) => (
      <Fragment>{children}</Fragment>
    ),
    useTranslate: () => (_key: string, fallback: string) => fallback,
    useLogout: () => ({ mutate: vi.fn() }),
    useIsExistAuthentication: () => false,
    useMenu: useMenuMock,
    useLink: useLinkMock,
    useWarnAboutChange: () => ({
      warnWhen: false,
      setWarnWhen: vi.fn(),
    }),
  };
});

vi.mock("@refinedev/antd", async () => {
  return {
    ThemedTitle: ({ collapsed }: { collapsed: boolean }) => (
      <div>{collapsed ? "collapsed" : "expanded"}</div>
    ),
    useThemedLayoutContext: () => ({
      siderCollapsed: false,
      setSiderCollapsed: vi.fn(),
      mobileSiderOpen: false,
      setMobileSiderOpen: vi.fn(),
    }),
  };
});

function createFixture(overrides?: {
  isMobile?: boolean;
  menuItems?: Array<{
    key: string;
    name: string;
    label: string;
    children: [];
    meta: Record<string, never>;
    list: string;
  }>;
  selectedKey?: string;
  defaultOpenKeys?: string[];
}) {
  const menuItems = overrides?.menuItems ?? [
    {
      key: "orders",
      name: "orders",
      label: "주문 관리",
      children: [],
      meta: {},
      list: "/orders",
    },
  ];

  return {
    isMobile: overrides?.isMobile ?? false,
    menuData: {
      menuItems,
      selectedKey: overrides?.selectedKey ?? "orders",
      defaultOpenKeys: overrides?.defaultOpenKeys ?? [],
    },
  };
}

describe("AdminSider", () => {
  it("선택된 메뉴도 다시 클릭할 수 있다", async () => {
    const fixture = createFixture();

    useIsMobileMock.mockImplementation(() => fixture.isMobile);
    useMenuMock.mockImplementation(() => fixture.menuData);
    useLinkMock.mockImplementation(
      () =>
        ({
          to,
          children,
          style,
        }: {
          to: string;
          children: ReactNode;
          style?: CSSProperties;
        }) => (
          <a href={to} style={style}>
            {children}
          </a>
        ),
    );

    render(<AdminSider />);

    expect(
      await screen.findByRole("link", { name: "주문 관리" }),
    ).not.toHaveStyle({
      pointerEvents: "none",
    });
  });
});
