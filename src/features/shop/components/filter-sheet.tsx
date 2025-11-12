import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ChevronDown, SlidersHorizontal, X } from "lucide-react";
import {
  type ProductCategory,
  type ProductColor,
  type ProductPattern,
  type ProductMaterial,
} from "../types/product";
import {
  CATEGORY_OPTIONS,
  COLOR_OPTIONS,
  PATTERN_OPTIONS,
  MATERIAL_OPTIONS,
  PRICE_RANGE_OPTIONS,
} from "../constants/FILTER_OPTIONS";

interface FilterSheetProps {
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
}

type FilterTab = "category" | "price" | "color" | "pattern" | "material";

export const FilterSheet = ({
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
}: FilterSheetProps) => {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>("category");

  const handleFilterButtonClick = (tab: FilterTab) => {
    setActiveTab(tab);
    setOpen(true);
  };

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
    <Sheet open={open} onOpenChange={setOpen}>
      <div className="sticky top-14 z-40 bg-background flex">
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2 ml-2 mt-2">
            <SlidersHorizontal />
          </Button>
        </SheetTrigger>
        <div className="flex gap-2 m-2 overflow-x-auto scrollbar-hidden">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleFilterButtonClick("category")}
          >
            카테고리
            <ChevronDown />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleFilterButtonClick("price")}
          >
            가격
            <ChevronDown />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleFilterButtonClick("color")}
          >
            색상
            <ChevronDown />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleFilterButtonClick("pattern")}
          >
            패턴
            <ChevronDown />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleFilterButtonClick("material")}
          >
            소재
            <ChevronDown />
          </Button>
        </div>
      </div>

      <SheetContent className="flex flex-col h-[70vh]" side="bottom">
        <SheetHeader>
          <SheetTitle>필터</SheetTitle>
        </SheetHeader>

        {hasFilters && (
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2 flex-1 overflow-x-auto scrollbar-hidden">
              {selectedFilters.map((filter, index) => (
                <div
                  key={index}
                  className="flex items-center gap-1 px-2 py-1 bg-accent rounded-sm text-sm flex-shrink-0"
                >
                  <span>{filter.label}</span>
                  <button
                    onClick={filter.onRemove}
                    className="hover:bg-background rounded-full p-0.5"
                  >
                    <X className="size-3" />
                  </button>
                </div>
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
            <div className="space-y-3">
              {CATEGORY_OPTIONS.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`category-${option.value}`}
                    checked={selectedCategories.includes(
                      option.value as ProductCategory
                    )}
                    onCheckedChange={() =>
                      onCategoryChange(option.value as ProductCategory)
                    }
                  />
                  <Label
                    htmlFor={`category-${option.value}`}
                    className="text-sm cursor-pointer"
                  >
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="price">
            <div className="space-y-3">
              {PRICE_RANGE_OPTIONS.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`price-${option.value}`}
                    checked={selectedPriceRange === option.value}
                    onCheckedChange={() => onPriceRangeChange(option.value)}
                  />
                  <Label
                    htmlFor={`price-${option.value}`}
                    className="text-sm cursor-pointer"
                  >
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="color">
            <div className="space-y-3">
              {COLOR_OPTIONS.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`color-${option.value}`}
                    checked={selectedColors.includes(
                      option.value as ProductColor
                    )}
                    onCheckedChange={() =>
                      onColorChange(option.value as ProductColor)
                    }
                  />
                  <Label
                    htmlFor={`color-${option.value}`}
                    className="text-sm cursor-pointer flex items-center gap-2"
                  >
                    <div
                      className="w-4 h-4 rounded-full border border-zinc-300"
                      style={{ backgroundColor: option.colorCode }}
                    />
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="pattern">
            <div className="space-y-3">
              {PATTERN_OPTIONS.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`pattern-${option.value}`}
                    checked={selectedPatterns.includes(
                      option.value as ProductPattern
                    )}
                    onCheckedChange={() =>
                      onPatternChange(option.value as ProductPattern)
                    }
                  />
                  <Label
                    htmlFor={`pattern-${option.value}`}
                    className="text-sm cursor-pointer"
                  >
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="material">
            <div className="space-y-3">
              {MATERIAL_OPTIONS.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`material-${option.value}`}
                    checked={selectedMaterials.includes(
                      option.value as ProductMaterial
                    )}
                    onCheckedChange={() =>
                      onMaterialChange(option.value as ProductMaterial)
                    }
                  />
                  <Label
                    htmlFor={`material-${option.value}`}
                    className="text-sm cursor-pointer"
                  >
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <div className="sticky bottom-0 bg-background p-2 border-t">
          <Button className="w-full" onClick={() => setOpen(false)}>
            적용하기
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
