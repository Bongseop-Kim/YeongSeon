import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui-extended/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import FilterOptionList from "@/features/shop/components/filter-option-list";
import { X } from "lucide-react";
import {
  type ProductCategory,
  type ProductColor,
  type ProductPattern,
  type ProductMaterial,
} from "@yeongseon/shared/types/view/product";
import {
  CATEGORY_OPTIONS,
  COLOR_OPTIONS,
  PATTERN_OPTIONS,
  MATERIAL_OPTIONS,
  PRICE_RANGE_OPTIONS,
} from "@/features/shop/constants/FILTER_OPTIONS";
import { Badge } from "@/components/ui/badge";
import type { FilterTab } from "@/features/shop/types/filter";

function appendFilterItems<T extends string>(
  filters: Array<{ label: string; onRemove: () => void }>,
  selected: T[],
  options: ReadonlyArray<{ readonly value: T; readonly label: string }>,
  onChange: (value: T) => void,
) {
  selected.forEach((value) => {
    const option = options.find((opt) => opt.value === value);
    if (option) {
      filters.push({ label: option.label, onRemove: () => onChange(value) });
    }
  });
}

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

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const selectedFilters = useMemo(() => {
    const filters: Array<{ label: string; onRemove: () => void }> = [];

    appendFilterItems(
      filters,
      selectedCategories,
      CATEGORY_OPTIONS,
      onCategoryChange,
    );
    appendFilterItems(filters, selectedColors, COLOR_OPTIONS, onColorChange);
    appendFilterItems(
      filters,
      selectedPatterns,
      PATTERN_OPTIONS,
      onPatternChange,
    );
    appendFilterItems(
      filters,
      selectedMaterials,
      MATERIAL_OPTIONS,
      onMaterialChange,
    );

    if (selectedPriceRange && selectedPriceRange !== "all") {
      const option = PRICE_RANGE_OPTIONS.find(
        (opt) => opt.value === selectedPriceRange,
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
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-200 px-1 pb-4">
          <div className="flex items-center gap-2 flex-1 flex-wrap">
            {selectedFilters.map((filter) => (
              <Badge
                variant="outline"
                className="gap-1 rounded-full border-zinc-200 bg-zinc-50 px-3 py-1 text-zinc-700"
                key={filter.label}
              >
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
          <Button
            variant="none"
            size="sm"
            className="h-8 rounded-full border border-zinc-200 px-3 text-zinc-600 shadow-none"
            onClick={onReset}
          >
            초기화
          </Button>
        </div>
      )}

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as FilterTab)}
        className="flex flex-1 flex-col overflow-hidden"
      >
        <TabsList className="w-full justify-start overflow-x-auto scrollbar-hidden border-b border-zinc-200 bg-transparent px-0">
          <TabsTrigger value="category">카테고리</TabsTrigger>
          <TabsTrigger value="price">가격</TabsTrigger>
          <TabsTrigger value="color">색상</TabsTrigger>
          <TabsTrigger value="pattern">패턴</TabsTrigger>
          <TabsTrigger value="material">소재</TabsTrigger>
        </TabsList>

        <TabsContent value="category" className="px-0 py-3">
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

        <TabsContent value="price" className="px-0 py-3">
          <FilterOptionList
            options={PRICE_RANGE_OPTIONS}
            checked={(value) => selectedPriceRange === value}
            onCheckedChange={(value) => onPriceRangeChange(value)}
            idPrefix="price"
          />
        </TabsContent>

        <TabsContent value="color" className="px-0 py-3">
          <FilterOptionList
            options={COLOR_OPTIONS}
            checked={(value) => selectedColors.includes(value as ProductColor)}
            onCheckedChange={(value) => onColorChange(value as ProductColor)}
            idPrefix="color"
          />
        </TabsContent>

        <TabsContent value="pattern" className="px-0 py-3">
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

        <TabsContent value="material" className="px-0 py-3">
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
        <div className="sticky bottom-0 border-t border-zinc-200 bg-background px-1 pt-4 pb-2">
          <Button className="h-11 w-full rounded-full" onClick={onApply}>
            적용하기
          </Button>
        </div>
      )}
    </>
  );
};
