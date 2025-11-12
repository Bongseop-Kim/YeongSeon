import { useState, useMemo } from "react";
import { FilterSheet } from "./components/filter-sheet";
import { ProductGrid } from "./components/product-grid";
import { SortSelect } from "./components/sort-select";
import { PRODUCTS_DATA } from "./constants/PRODUCTS_DATA";
import { PRICE_RANGE_OPTIONS } from "./constants/FILTER_OPTIONS";
import type {
  ProductCategory,
  ProductColor,
  ProductPattern,
  ProductMaterial,
  SortOption,
} from "./types/product";
import { MainContent, MainLayout } from "@/components/layout/main-layout";
import TwoPanelLayout from "@/components/layout/two-panel-layout";

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

  const filteredAndSortedProducts = useMemo(() => {
    let filtered = PRODUCTS_DATA;

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
    selectedCategories,
    selectedColors,
    selectedPatterns,
    selectedMaterials,
    selectedPriceRange,
    sortOption,
  ]);

  return (
    <MainLayout>
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
      />
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
