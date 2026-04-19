import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSearch } from "@/shared/hooks/use-search";

const { setSearchEnabled } = vi.hoisted(() => ({
  setSearchEnabled: vi.fn(),
}));

vi.mock("@/shared/store/search", () => ({
  useSearchStore: <T,>(
    selector: (state: { setSearchEnabled: typeof setSearchEnabled }) => T,
  ) => selector({ setSearchEnabled }),
}));

describe("useSearch", () => {
  beforeEach(() => {
    setSearchEnabled.mockReset();
  });

  it("마운트 시 setSearchEnabled(true, ...)를 호출한다", () => {
    const onSearch = vi.fn();
    renderHook(() => useSearch({ placeholder: "검색어 입력", onSearch }));

    expect(setSearchEnabled).toHaveBeenCalledWith(
      true,
      expect.objectContaining({ placeholder: "검색어 입력" }),
    );
  });

  it("unmount 시 setSearchEnabled(false)를 호출한다", () => {
    const onSearch = vi.fn();
    const { unmount } = renderHook(() =>
      useSearch({ placeholder: "검색어 입력", onSearch }),
    );

    setSearchEnabled.mockClear();
    unmount();

    expect(setSearchEnabled).toHaveBeenCalledWith(false);
  });

  it("store에 등록된 onSearch 콜백을 통해 실제 onSearch가 호출된다", () => {
    const onSearch = vi.fn();
    renderHook(() => useSearch({ placeholder: "검색", onSearch }));

    const registeredOptions = setSearchEnabled.mock.calls[0][1] as {
      onSearch: (query: string, dateFilter: unknown) => void;
    };
    registeredOptions.onSearch("query", { preset: "1month" });

    expect(onSearch).toHaveBeenCalledWith("query", { preset: "1month" });
  });
});
