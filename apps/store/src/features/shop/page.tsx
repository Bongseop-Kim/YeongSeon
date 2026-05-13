import { useState, useMemo, useEffect, useRef } from "react";
import { PageSeo } from "@/shared/ui/page-seo";
import { FilterSheet } from "./components/filter-sheet";
import { FilterButtons } from "./components/filter-buttons";
import { FilterContent } from "./components/filter-content";
import { ProductGrid } from "./components/product-grid";
import { SortSelect } from "./components/sort-select";
import { PRICE_RANGE_OPTIONS } from "./constants/FILTER_OPTIONS";
import { useProducts } from "@/entities/shop";
import { analytics } from "@/shared/lib/analytics";
import type {
  ProductCategory,
  ProductColor,
  ProductPattern,
  ProductMaterial,
  SortOption,
} from "@yeongseon/shared/types/view/product";
import { MainContent, MainLayout } from "@/shared/layout/main-layout";
import { PageLayout } from "@/shared/layout/page-layout";
import { Button } from "@/shared/ui-extended/button";
import { useBreakpoint } from "@/shared/lib/breakpoint-provider";
import type { FilterTab } from "@/features/shop/types/filter";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui-extended/dialog";

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

  const firedRef = useRef(false);

  useEffect(() => {
    if (!isLoading && products.length > 0 && !firedRef.current) {
      firedRef.current = true;
      analytics.track("view_item_list", {
        item_list_id: "shop",
        item_list_name: "상품 목록",
      });
    }
  }, [isLoading, products.length]);

  return (
    <>
      <PageSeo
        title="넥타이 쇼핑"
        description="ESSE SION의 다양한 넥타이 컬렉션. 비즈니스·웨딩·선물용 넥타이를 엄선된 소재로 제공합니다."
        ogUrl="https://essesion.shop/shop"
      />
      <MainLayout>
        <MainContent>
          <PageLayout>
            <div className="pb-16">
              <section className="sticky top-0 z-30 border-b border-zinc-200 bg-background/92 backdrop-blur">
                <div className="flex flex-col gap-2 py-4 lg:flex-row lg:items-center lg:justify-between">
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

                  <div className="flex items-center justify-between gap-3 lg:justify-end px-2">
                    <div className="text-sm text-zinc-500">
                      {isLoading
                        ? "상품을 찾는 중"
                        : `총 ${products.length}개 상품`}
                    </div>
                    <SortSelect value={sortOption} onChange={setSortOption} />
                  </div>
                </div>
              </section>

              <section className="lg:pt-10">
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
    </>
  );
}
