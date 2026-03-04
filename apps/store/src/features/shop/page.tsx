import { useState, useMemo } from "react";
import { FilterSheet } from "./components/filter-sheet";
import { FilterButtons } from "./components/filter-buttons";
import { FilterContent } from "./components/filter-content";
import { ProductGrid } from "./components/product-grid";
import { SortSelect } from "./components/sort-select";
import { PRICE_RANGE_OPTIONS } from "./constants/FILTER_OPTIONS";
import { useProducts } from "./api/products-query";
import type {
  ProductCategory,
  ProductColor,
  ProductPattern,
  ProductMaterial,
  SortOption,
} from "@yeongseon/shared/types/view/product";
import { MainContent, MainLayout } from "@/components/layout/main-layout";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { useBreakpoint } from "@/providers/breakpoint-provider";
import type { FilterTab } from "@/features/shop/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function ShopPage() {
  const [selectedCategories, setSelectedCategories] = useState<
    ProductCategory[]
  >([]);
  const [selectedColors, setSelectedColors] = useState<ProductColor[]>([]);
  const [selectedPatterns, setSelectedPatterns] = useState<ProductPattern[]>(
    []
  );
  const [selectedMaterials, setSelectedMaterials] = useState<ProductMaterial[]>(
    []
  );
  const [selectedPriceRange, setSelectedPriceRange] = useState<string>("all");
  const [sortOption, setSortOption] = useState<SortOption>("latest");
  const { isMobile } = useBreakpoint();
  const [activeFilterTab, setActiveFilterTab] = useState<FilterTab>("category");
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  const handleCategoryChange = (category: ProductCategory) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const handleColorChange = (color: ProductColor) => {
    setSelectedColors((prev) =>
      prev.includes(color) ? prev.filter((c) => c !== color) : [...prev, color]
    );
  };

  const handlePatternChange = (pattern: ProductPattern) => {
    setSelectedPatterns((prev) =>
      prev.includes(pattern)
        ? prev.filter((p) => p !== pattern)
        : [...prev, pattern]
    );
  };

  const handleMaterialChange = (material: ProductMaterial) => {
    setSelectedMaterials((prev) =>
      prev.includes(material)
        ? prev.filter((m) => m !== material)
        : [...prev, material]
    );
  };

  const handlePriceRangeChange = (range: string) => {
    setSelectedPriceRange(range);
  };

  const handleResetFilters = () => {
    setSelectedCategories([]);
    setSelectedColors([]);
    setSelectedPatterns([]);
    setSelectedMaterials([]);
    setSelectedPriceRange("all");
  };

  const handleFilterButtonClick = (tab: FilterTab) => {
    setActiveFilterTab(tab);
    if (!isMobile) {
      setIsFilterModalOpen(true);
    }
    // 모바일에서는 FilterSheet가 자체적으로 처리
  };

  const selectedPriceOption = useMemo(
    () =>
      PRICE_RANGE_OPTIONS.find((opt) => opt.value === selectedPriceRange) ??
      PRICE_RANGE_OPTIONS[0],
    [selectedPriceRange]
  );

  const priceMin =
    selectedPriceOption.value === "all" ? null : selectedPriceOption.min;
  const priceMax = Number.isFinite(selectedPriceOption.max)
    ? selectedPriceOption.max
    : null;

  const { data: products = [], isLoading } = useProducts({
    categories: selectedCategories,
    colors: selectedColors,
    patterns: selectedPatterns,
    materials: selectedMaterials,
    priceMin,
    priceMax,
    sortOption,
  });

  const productList = isLoading ? [] : products;

  return (
    <MainLayout>
      {isMobile ? (
        <FilterSheet
          selectedCategories={selectedCategories}
          selectedColors={selectedColors}
          selectedPatterns={selectedPatterns}
          selectedMaterials={selectedMaterials}
          selectedPriceRange={selectedPriceRange}
          onCategoryChange={handleCategoryChange}
          onColorChange={handleColorChange}
          onPatternChange={handlePatternChange}
          onMaterialChange={handleMaterialChange}
          onPriceRangeChange={handlePriceRangeChange}
          onReset={handleResetFilters}
          initialTab={activeFilterTab}
        />
      ) : (
        <FilterButtons
          onFilterClick={handleFilterButtonClick}
          onMainButtonClick={() => setIsFilterModalOpen(true)}
        />
      )}
      <MainContent>
        <PageLayout>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs text-zinc-800 px-2">
                  전체 {productList.length}개
                </span>
                <SortSelect value={sortOption} onChange={setSortOption} />
              </div>
              <ProductGrid products={productList} />
        </PageLayout>
      </MainContent>

      {/* PC 필터 모달 — ShopPage 내에서 직접 렌더링하여 필터 상태와 동일한 렌더 사이클 공유 */}
      <Dialog open={isFilterModalOpen} onOpenChange={setIsFilterModalOpen}>
        <DialogContent className="flex flex-col max-h-[80vh] p-0 gap-0" showCloseButton={false}>
          <DialogHeader className="p-4 border-b">
            <DialogTitle>필터</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-4">
            <FilterContent
              selectedCategories={selectedCategories}
              selectedColors={selectedColors}
              selectedPatterns={selectedPatterns}
              selectedMaterials={selectedMaterials}
              selectedPriceRange={selectedPriceRange}
              onCategoryChange={handleCategoryChange}
              onColorChange={handleColorChange}
              onPatternChange={handlePatternChange}
              onMaterialChange={handleMaterialChange}
              onPriceRangeChange={handlePriceRangeChange}
              onReset={handleResetFilters}
              initialTab={activeFilterTab}
            />
          </div>
          <div className="p-4 border-t">
            <Button className="w-full" onClick={() => setIsFilterModalOpen(false)}>
              적용하기
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
