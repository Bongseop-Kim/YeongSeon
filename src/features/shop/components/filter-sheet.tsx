import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { FilterSection } from "./filter-section";
import { SlidersHorizontal } from "lucide-react";
import {
  type ProductCategory,
  type ProductColor,
  type ProductPattern,
  type ProductMaterial,
} from "../types/product";

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
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <SlidersHorizontal className="w-4 h-4" />
          필터
        </Button>
      </SheetTrigger>
      <SheetContent className="w-80 overflow-y-auto">
        <SheetHeader>
          <SheetTitle>필터</SheetTitle>
        </SheetHeader>
        <div className="mt-6">
          <FilterSection
            selectedCategories={selectedCategories}
            selectedColors={selectedColors}
            selectedPatterns={selectedPatterns}
            selectedMaterials={selectedMaterials}
            selectedPriceRange={selectedPriceRange}
            onCategoryChange={onCategoryChange}
            onColorChange={onColorChange}
            onPatternChange={onPatternChange}
            onMaterialChange={onMaterialChange}
            onPriceRangeChange={onPriceRangeChange}
          />
          <div className="mt-6 pt-6 border-t">
            <Button variant="outline" className="w-full" onClick={onReset}>
              필터 초기화
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
