import { useState, useMemo } from "react";
import { FilterSheet } from "./components/filter-sheet";
import { FilterButtons } from "./components/filter-buttons";
import { FilterContent } from "./components/filter-content";
import { ProductGrid } from "./components/product-grid";
import { SortSelect } from "./components/sort-select";
import {
  CATEGORY_OPTIONS,
  COLOR_OPTIONS,
  MATERIAL_OPTIONS,
  PATTERN_OPTIONS,
  PRICE_RANGE_OPTIONS,
  SORT_OPTIONS,
} from "./constants/FILTER_OPTIONS";
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
import { Button } from "@/components/ui-extended/button";
import { useBreakpoint } from "@/providers/breakpoint-provider";
import type { FilterTab } from "@/features/shop/types/filter";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui-extended/dialog";
import { Badge } from "@/components/ui/badge";

export default function ShopPage() {
  const [selectedCategories, setSelectedCategories] = useState<
    ProductCategory[]
  >([]);
  const [selectedColors, setSelectedColors] = useState<ProductColor[]>([]);
  const [selectedPatterns, setSelectedPatterns] = useState<ProductPattern[]>(
    [],
  );
  const [selectedMaterials, setSelectedMaterials] = useState<ProductMaterial[]>(
    [],
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
        : [...prev, category],
    );
  };

  const handleColorChange = (color: ProductColor) => {
    setSelectedColors((prev) =>
      prev.includes(color) ? prev.filter((c) => c !== color) : [...prev, color],
    );
  };

  const handlePatternChange = (pattern: ProductPattern) => {
    setSelectedPatterns((prev) =>
      prev.includes(pattern)
        ? prev.filter((p) => p !== pattern)
        : [...prev, pattern],
    );
  };

  const handleMaterialChange = (material: ProductMaterial) => {
    setSelectedMaterials((prev) =>
      prev.includes(material)
        ? prev.filter((m) => m !== material)
        : [...prev, material],
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
    [selectedPriceRange],
  );

  const selectedFilterLabels = useMemo(() => {
    const labels: Array<string | null | undefined> = [
      ...selectedCategories.map(
        (category) =>
          CATEGORY_OPTIONS.find((option) => option.value === category)?.label,
      ),
      ...selectedColors.map(
        (color) =>
          COLOR_OPTIONS.find((option) => option.value === color)?.label,
      ),
      ...selectedPatterns.map(
        (pattern) =>
          PATTERN_OPTIONS.find((option) => option.value === pattern)?.label,
      ),
      ...selectedMaterials.map(
        (material) =>
          MATERIAL_OPTIONS.find((option) => option.value === material)?.label,
      ),
      selectedPriceRange !== "all" ? selectedPriceOption.label : null,
    ];

    return labels.filter((label): label is string => label != null);
  }, [
    selectedCategories,
    selectedColors,
    selectedPatterns,
    selectedMaterials,
    selectedPriceRange,
    selectedPriceOption.label,
  ]);

  const activeFilterCounts = {
    category: selectedCategories.length,
    price: selectedPriceRange !== "all" ? 1 : 0,
    color: selectedColors.length,
    pattern: selectedPatterns.length,
    material: selectedMaterials.length,
  } satisfies Partial<Record<FilterTab, number>>;

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

  const selectedFilterCount = selectedFilterLabels.length;

  return (
    <MainLayout>
      <MainContent>
        <PageLayout>
          <div className="pb-16">
            <section className="border-b border-zinc-200 pb-8 pt-8 lg:pb-10 lg:pt-10">
              <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-end">
                <div className="max-w-2xl">
                  <p className="text-[11px] uppercase tracking-[0.35em] text-zinc-500">
                    YeongSeon Store
                  </p>
                  <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-zinc-950 lg:text-5xl">
                    바로 구매 가능한
                    <br />
                    넥타이 컬렉션
                  </h1>
                  <p className="mt-4 max-w-xl text-sm leading-6 text-zinc-600 lg:text-base">
                    제작이 끝난 제품을 카테고리, 색상, 패턴 기준으로 빠르게
                    추려볼 수 있습니다. 첫 선택은 단순하게, 비교는 편하게
                    구성했습니다.
                  </p>
                </div>

                <div className="border-t border-zinc-200">
                  <div className="flex items-center justify-between border-b border-zinc-200 py-3 text-sm">
                    <span className="text-zinc-500">현재 상품 수</span>
                    <span className="font-medium text-zinc-900">
                      {isLoading ? "불러오는 중" : `${products.length}개`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-zinc-200 py-3 text-sm">
                    <span className="text-zinc-500">선택된 필터</span>
                    <span className="font-medium text-zinc-900">
                      {selectedFilterCount}개
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-3 text-sm">
                    <span className="text-zinc-500">기본 정렬</span>
                    <span className="font-medium text-zinc-900">
                      {SORT_OPTIONS.find((o) => o.value === sortOption)?.label}
                    </span>
                  </div>
                </div>
              </div>

              {selectedFilterLabels.length > 0 ? (
                <div className="mt-6 flex flex-wrap items-center gap-2">
                  {selectedFilterLabels.map((label) => (
                    <Badge
                      key={label}
                      variant="outline"
                      className="rounded-full border-zinc-200 bg-zinc-50 px-3 py-1 text-zinc-700"
                    >
                      {label}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </section>

            <section className="sticky top-0 z-30 border-b border-zinc-200 bg-background/92 backdrop-blur">
              <div className="flex flex-col gap-4 py-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
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
                      activeCounts={activeFilterCounts}
                    />
                  ) : (
                    <FilterButtons
                      onFilterClick={handleFilterButtonClick}
                      onMainButtonClick={() => setIsFilterModalOpen(true)}
                      activeCounts={activeFilterCounts}
                    />
                  )}
                </div>

                <div className="flex items-center justify-between gap-3 lg:justify-end">
                  <div className="text-sm text-zinc-500">
                    {isLoading
                      ? "상품을 찾는 중"
                      : `총 ${products.length}개 상품`}
                  </div>
                  <SortSelect value={sortOption} onChange={setSortOption} />
                </div>
              </div>
            </section>

            <section className="pt-8 lg:pt-10">
              <ProductGrid products={products} isLoading={isLoading} />
            </section>
          </div>
        </PageLayout>
      </MainContent>

      {/* PC 필터 모달 — ShopPage 내에서 직접 렌더링하여 필터 상태와 동일한 렌더 사이클 공유 */}
      <Dialog open={isFilterModalOpen} onOpenChange={setIsFilterModalOpen}>
        <DialogContent
          className="flex max-h-[80vh] flex-col gap-0 p-0"
          showCloseButton={false}
        >
          <DialogHeader className="border-zinc-200 p-5">
            <DialogTitle>필터</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
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
          <div className="border-t border-zinc-200 p-5">
            <Button
              type="button"
              className="w-full"
              size="xl"
              onClick={() => setIsFilterModalOpen(false)}
            >
              적용하기
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
