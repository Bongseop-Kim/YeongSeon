import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FilterSheet } from "@/features/shop/components/filter-sheet";

const baseProps = {
  selectedCategories: [],
  selectedColors: [],
  selectedPatterns: [],
  selectedMaterials: [],
  selectedPriceRange: "all",
  onCategoryChange: vi.fn(),
  onColorChange: vi.fn(),
  onPatternChange: vi.fn(),
  onMaterialChange: vi.fn(),
  onPriceRangeChange: vi.fn(),
  onReset: vi.fn(),
};

describe("FilterSheet", () => {
  it("hides the all-filter trigger while keeping individual filter chips", () => {
    render(<FilterSheet {...baseProps} activeCounts={{ price: 1 }} />);

    expect(
      screen.queryByRole("button", { name: "전체 필터" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "가격 1" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "카테고리" }),
    ).toBeInTheDocument();
  });
});
