import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useShopFilters } from "@/features/shop/hooks/use-shop-filters";

describe("useShopFilters", () => {
  it("초기 필터 상태와 전체 가격 범위 값을 제공한다", () => {
    const { result } = renderHook(() => useShopFilters());

    expect(result.current.applied).toMatchObject({
      selectedCategories: [],
      selectedColors: [],
      selectedPatterns: [],
      selectedMaterials: [],
      selectedPriceRange: "all",
    });
    expect(result.current.draft).toEqual(result.current.applied);
    expect(result.current.activeTab).toBe("category");
    expect(result.current.isDialogOpen).toBe(false);
    expect(result.current.priceMin).toBeNull();
    expect(result.current.priceMax).toBeNull();
    expect(result.current.activeCounts).toEqual({
      category: 0,
      price: 0,
      color: 0,
      pattern: 0,
      material: 0,
    });
  });

  it("다이얼로그를 열 때 적용된 필터를 draft로 복사하고 닫을 수 있다", () => {
    const { result } = renderHook(() => useShopFilters());

    act(() => {
      result.current.openDialog("color");
      result.current.toggleDraftColor("navy");
      result.current.applyDraft();
    });
    act(() => {
      result.current.openDialog("pattern");
    });

    expect(result.current.isDialogOpen).toBe(true);
    expect(result.current.activeTab).toBe("pattern");
    expect(result.current.draft.selectedColors).toEqual(["navy"]);

    act(() => {
      result.current.closeDialog();
    });

    expect(result.current.isDialogOpen).toBe(false);
  });

  it("draft 필터를 토글하고 적용하면 active count와 가격 범위를 갱신한다", () => {
    const { result } = renderHook(() => useShopFilters());

    act(() => {
      result.current.openDialog("category");
      result.current.toggleDraftCategory("3fold");
      result.current.toggleDraftColor("black");
      result.current.toggleDraftPattern("solid");
      result.current.toggleDraftMaterial("silk");
      result.current.setDraftPriceRange("30-50");
      result.current.applyDraft();
    });

    expect(result.current.applied).toMatchObject({
      selectedCategories: ["3fold"],
      selectedColors: ["black"],
      selectedPatterns: ["solid"],
      selectedMaterials: ["silk"],
      selectedPriceRange: "30-50",
    });
    expect(result.current.activeCounts).toEqual({
      category: 1,
      price: 1,
      color: 1,
      pattern: 1,
      material: 1,
    });
    expect(result.current.priceMin).toBe(30000);
    expect(result.current.priceMax).toBe(49999);
  });

  it("draft와 applied를 각각 초기화한다", () => {
    const { result } = renderHook(() => useShopFilters());

    act(() => {
      result.current.openDialog("price");
      result.current.toggleDraftCategory("knit");
      result.current.setDraftPriceRange("over-70");
      result.current.resetDraft();
    });

    expect(result.current.draft).toMatchObject({
      selectedCategories: [],
      selectedPriceRange: "all",
    });

    act(() => {
      result.current.toggleDraftCategory("knit");
      result.current.setDraftPriceRange("over-70");
      result.current.applyDraft();
    });

    expect(result.current.priceMin).toBe(70000);
    expect(result.current.priceMax).toBeNull();

    act(() => {
      result.current.resetApplied();
    });

    expect(result.current.applied).toMatchObject({
      selectedCategories: [],
      selectedColors: [],
      selectedPatterns: [],
      selectedMaterials: [],
      selectedPriceRange: "all",
    });
    expect(result.current.activeCounts.category).toBe(0);
    expect(result.current.activeCounts.price).toBe(0);
  });
});
