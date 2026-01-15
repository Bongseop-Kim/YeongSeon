import { useState, useMemo, useEffect, useCallback, useRef } from "react";
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
} from "./types/product";
import { MainContent, MainLayout } from "@/components/layout/main-layout";
import TwoPanelLayout from "@/components/layout/two-panel-layout";
import { useModalStore } from "@/store/modal";
import { Button } from "@/components/ui/button";
import { useBreakpoint } from "@/providers/breakpoint-provider";

type FilterTab = "category" | "price" | "color" | "pattern" | "material";

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
  const { openModal, closeModal, isOpen } = useModalStore();
  const isModalUpdatingRef = useRef(false);

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
      // PC에서는 모달 열기
      openFilterModal(tab);
    }
    // 모바일에서는 FilterSheet가 자체적으로 처리
  };

  const openFilterModal = useCallback(
    (tab?: FilterTab) => {
      if (isModalUpdatingRef.current) return;
      isModalUpdatingRef.current = true;
      openModal({
        title: "필터",
        modalType: "custom",
        showDefaultFooter: false,
        customFooter: (
          <div className="sticky bottom-0 bg-background p-2 border-t">
            <Button className="w-full" onClick={closeModal}>
              적용하기
            </Button>
          </div>
        ),
        children: () => (
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
            initialTab={tab || activeFilterTab}
          />
        ),
      });
      setTimeout(() => {
        isModalUpdatingRef.current = false;
      }, 0);
    },
    [
      selectedCategories,
      selectedColors,
      selectedPatterns,
      selectedMaterials,
      selectedPriceRange,
      activeFilterTab,
      openModal,
      closeModal,
      handleCategoryChange,
      handleColorChange,
      handlePatternChange,
      handleMaterialChange,
      handlePriceRangeChange,
      handleResetFilters,
    ]
  );

  // 모달이 열려있는 동안 필터 상태가 변경되면 모달 업데이트
  useEffect(() => {
    if (isOpen && !isMobile && !isModalUpdatingRef.current) {
      // 모달이 열려있고 PC일 때만 업데이트
      openFilterModal(activeFilterTab);
    }
  }, [
    selectedCategories,
    selectedColors,
    selectedPatterns,
    selectedMaterials,
    selectedPriceRange,
    activeFilterTab,
    isOpen,
    isMobile,
    openFilterModal,
  ]);

  const { data: products = [], isLoading } = useProducts();

  const filteredAndSortedProducts = useMemo(() => {
    if (isLoading) {
      return [];
    }
    let filtered = products;

    if (selectedCategories.length > 0) {
      filtered = filtered.filter((product) =>
        selectedCategories.includes(product.category)
      );
    }

    if (selectedColors.length > 0) {
      filtered = filtered.filter((product) =>
        selectedColors.includes(product.color)
      );
    }

    if (selectedPatterns.length > 0) {
      filtered = filtered.filter((product) =>
        selectedPatterns.includes(product.pattern)
      );
    }

    if (selectedMaterials.length > 0) {
      filtered = filtered.filter((product) =>
        selectedMaterials.includes(product.material)
      );
    }

    if (selectedPriceRange !== "all") {
      const priceRange = PRICE_RANGE_OPTIONS.find(
        (opt) => opt.value === selectedPriceRange
      );
      if (priceRange) {
        filtered = filtered.filter(
          (product) =>
            product.price >= priceRange.min && product.price <= priceRange.max
        );
      }
    }

    const sorted = [...filtered];
    switch (sortOption) {
      case "latest":
        sorted.sort((a, b) => b.id - a.id);
        break;
      case "price-low":
        sorted.sort((a, b) => a.price - b.price);
        break;
      case "price-high":
        sorted.sort((a, b) => b.price - a.price);
        break;
      case "popular":
        sorted.sort((a, b) => {
          if (a.likes > b.likes) return -1;
          if (a.likes < b.likes) return 1;
          return 0;
        });
        break;
    }

    return sorted;
  }, [
    products,
    isLoading,
    selectedCategories,
    selectedColors,
    selectedPatterns,
    selectedMaterials,
    selectedPriceRange,
    sortOption,
  ]);

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
          onMainButtonClick={() => openFilterModal()}
        />
      )}
      <MainContent>
        <TwoPanelLayout
          leftPanel={
            <>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs text-zinc-800 px-2">
                  전체 {filteredAndSortedProducts.length}개
                </span>
                <SortSelect value={sortOption} onChange={setSortOption} />
              </div>
              <ProductGrid products={filteredAndSortedProducts} />
            </>
          }
        />
      </MainContent>
    </MainLayout>
  );
}
