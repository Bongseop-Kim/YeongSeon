import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import FilterOptionList from "./filter-option-list";
import { X } from "lucide-react";
import {
  type ProductCategory,
  type ProductColor,
  type ProductPattern,
  type ProductMaterial,
} from "@/features/shop/types/view/product";
import {
  CATEGORY_OPTIONS,
  COLOR_OPTIONS,
  PATTERN_OPTIONS,
  MATERIAL_OPTIONS,
  PRICE_RANGE_OPTIONS,
} from "../constants/FILTER_OPTIONS";
import { Badge } from "@/components/ui/badge";

type FilterTab = "category" | "price" | "color" | "pattern" | "material";

interface FilterContentProps {
  selectedCategories: ProductCategory[];
  selectedColors: ProductColor[];
  selectedPatterns: ProductPattern[];
  selectedMaterials: ProductMaterial[];
  selectedPriceRange: string;
  onCategoryChange: (category: ProductCategory) => void;
  onColorChange: (color: ProductColor) => void;
  onPatternChange: (pattern: ProductPattern) => void;
  onMaterialChange: (material: ProductMaterial) => void;
  onPriceRangeChange: (range: string) => void;
  onReset: () => void;
  showApplyButton?: boolean;
  onApply?: () => void;
  initialTab?: FilterTab;
}

export const FilterContent = ({
  selectedCategories,
  selectedColors,
  selectedPatterns,
  selectedMaterials,
  selectedPriceRange,
  onCategoryChange,
  onColorChange,
  onPatternChange,
  onMaterialChange,
  onPriceRangeChange,
  onReset,
  showApplyButton = false,
  onApply,
  initialTab = "category",
}: FilterContentProps) => {
  const [activeTab, setActiveTab] = useState<FilterTab>(initialTab);

  // initialTab이 변경되면 activeTab도 업데이트
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const selectedFilters = useMemo(() => {
    const filters: Array<{ label: string; onRemove: () => void }> = [];

    selectedCategories.forEach((category) => {
      const option = CATEGORY_OPTIONS.find((opt) => opt.value === category);
      if (option) {
        filters.push({
          label: option.label,
          onRemove: () => onCategoryChange(category),
        });
      }
    });

    selectedColors.forEach((color) => {
      const option = COLOR_OPTIONS.find((opt) => opt.value === color);
      if (option) {
        filters.push({
          label: option.label,
          onRemove: () => onColorChange(color),
        });
      }
    });

    selectedPatterns.forEach((pattern) => {
      const option = PATTERN_OPTIONS.find((opt) => opt.value === pattern);
      if (option) {
        filters.push({
          label: option.label,
          onRemove: () => onPatternChange(pattern),
        });
      }
    });

    selectedMaterials.forEach((material) => {
      const option = MATERIAL_OPTIONS.find((opt) => opt.value === material);
      if (option) {
        filters.push({
          label: option.label,
          onRemove: () => onMaterialChange(material),
        });
      }
    });

    if (selectedPriceRange && selectedPriceRange !== "all") {
      const option = PRICE_RANGE_OPTIONS.find(
        (opt) => opt.value === selectedPriceRange
      );
      if (option) {
        filters.push({
          label: option.label,
          onRemove: () => onPriceRangeChange("all"),
        });
      }
    }

    return filters;
  }, [
    selectedCategories,
    selectedColors,
    selectedPatterns,
    selectedMaterials,
    selectedPriceRange,
    onCategoryChange,
    onColorChange,
    onPatternChange,
    onMaterialChange,
    onPriceRangeChange,
  ]);

  const hasFilters = selectedFilters.length > 0;

  return (
    <>
      {hasFilters && (
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2 flex-1 overflow-x-auto scrollbar-hidden">
            {selectedFilters.map((filter, index) => (
              <Badge variant="secondary" className="gap-1" key={index}>
                <span>{filter.label}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    filter.onRemove();
                  }}
                  className="rounded-full p-0.5 -mr-1 pointer-events-auto"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
          <Button variant="text" size="sm" onClick={onReset}>
            초기화
          </Button>
        </div>
      )}

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as FilterTab)}
        className="flex-1 flex flex-col overflow-hidden"
      >
        <TabsList className="w-full justify-start overflow-x-auto scrollbar-hidden border-b">
          <TabsTrigger value="category">카테고리</TabsTrigger>
          <TabsTrigger value="price">가격</TabsTrigger>
          <TabsTrigger value="color">색상</TabsTrigger>
          <TabsTrigger value="pattern">패턴</TabsTrigger>
          <TabsTrigger value="material">소재</TabsTrigger>
        </TabsList>

        <TabsContent value="category">
          <FilterOptionList
            options={CATEGORY_OPTIONS}
            checked={(value) =>
              selectedCategories.includes(value as ProductCategory)
            }
            onCheckedChange={(value) =>
              onCategoryChange(value as ProductCategory)
            }
            idPrefix="category"
          />
        </TabsContent>

        <TabsContent value="price">
          <FilterOptionList
            options={PRICE_RANGE_OPTIONS}
            checked={(value) => selectedPriceRange === value}
            onCheckedChange={(value) => onPriceRangeChange(value)}
            idPrefix="price"
          />
        </TabsContent>

        <TabsContent value="color">
          <FilterOptionList
            options={COLOR_OPTIONS}
            checked={(value) => selectedColors.includes(value as ProductColor)}
            onCheckedChange={(value) => onColorChange(value as ProductColor)}
            idPrefix="color"
          />
        </TabsContent>

        <TabsContent value="pattern">
          <FilterOptionList
            options={PATTERN_OPTIONS}
            checked={(value) =>
              selectedPatterns.includes(value as ProductPattern)
            }
            onCheckedChange={(value) =>
              onPatternChange(value as ProductPattern)
            }
            idPrefix="pattern"
          />
        </TabsContent>

        <TabsContent value="material">
          <FilterOptionList
            options={MATERIAL_OPTIONS}
            checked={(value) =>
              selectedMaterials.includes(value as ProductMaterial)
            }
            onCheckedChange={(value) =>
              onMaterialChange(value as ProductMaterial)
            }
            idPrefix="material"
          />
        </TabsContent>
      </Tabs>

      {showApplyButton && onApply && (
        <div className="sticky bottom-0 bg-background p-2 border-t">
          <Button className="w-full" onClick={onApply}>
            적용하기
          </Button>
        </div>
      )}
    </>
  );
};
