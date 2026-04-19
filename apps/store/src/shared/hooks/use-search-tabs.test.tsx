import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSearchTabs } from "@/shared/hooks/use-search-tabs";

const { setSearchEnabled, setTabsActiveTab } = vi.hoisted(() => ({
  setSearchEnabled: vi.fn(),
  setTabsActiveTab: vi.fn(),
}));

const mockConfig: { tabs?: { activeTab: string } } = { tabs: undefined };

vi.mock("@/shared/store/search", () => ({
  useSearchStore: <T,>(
    selector: (state: {
      setSearchEnabled: typeof setSearchEnabled;
      setTabsActiveTab: typeof setTabsActiveTab;
      config: typeof mockConfig;
    }) => T,
  ) =>
    selector({
      setSearchEnabled,
      setTabsActiveTab,
      config: mockConfig,
    }),
}));

const TABS = ["전체", "진행중", "완료"] as const;
type Tab = (typeof TABS)[number];

describe("useSearchTabs", () => {
  beforeEach(() => {
    setSearchEnabled.mockReset();
    setTabsActiveTab.mockReset();
    mockConfig.tabs = undefined;
  });

  it("마운트 시 setSearchEnabled(true, { tabs: ... })를 호출한다", () => {
    renderHook(() =>
      useSearchTabs<Tab>({
        tabs: TABS,
        defaultTab: "전체",
        placeholder: "검색",
        onSearch: vi.fn(),
      }),
    );

    expect(setSearchEnabled).toHaveBeenCalledWith(
      true,
      expect.objectContaining({
        placeholder: "검색",
        tabs: expect.objectContaining({
          items: [...TABS],
          activeTab: "전체",
        }),
      }),
    );
  });

  it("unmount 시 setSearchEnabled(false)를 호출한다", () => {
    const { unmount } = renderHook(() =>
      useSearchTabs<Tab>({
        tabs: TABS,
        defaultTab: "전체",
        placeholder: "검색",
        onSearch: vi.fn(),
      }),
    );

    setSearchEnabled.mockClear();
    unmount();

    expect(setSearchEnabled).toHaveBeenCalledWith(false);
  });

  it("store config에 activeTab이 없으면 defaultTab을 반환한다", () => {
    mockConfig.tabs = undefined;
    const { result } = renderHook(() =>
      useSearchTabs<Tab>({
        tabs: TABS,
        defaultTab: "진행중",
        placeholder: "검색",
        onSearch: vi.fn(),
      }),
    );

    expect(result.current).toBe("진행중");
  });

  it("store config에 activeTab이 있으면 해당 값을 반환한다", () => {
    mockConfig.tabs = { activeTab: "완료" };
    const { result } = renderHook(() =>
      useSearchTabs<Tab>({
        tabs: TABS,
        defaultTab: "전체",
        placeholder: "검색",
        onSearch: vi.fn(),
      }),
    );

    expect(result.current).toBe("완료");
  });
});
