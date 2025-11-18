import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { FilterContent } from "./filter-content";
import { FilterButtons } from "./filter-buttons";
import { SlidersHorizontal } from "lucide-react";
import {
  type ProductCategory,
  type ProductColor,
  type ProductPattern,
  type ProductMaterial,
} from "../types/product";

type FilterTab = "category" | "price" | "color" | "pattern" | "material";

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
  initialTab?: FilterTab;
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
  initialTab = "category",
}: FilterSheetProps) => {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const handleFilterButtonClick = (tab: FilterTab) => {
    setActiveTab(tab);
    setOpen(true);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <FilterButtons
        onFilterClick={handleFilterButtonClick}
        mainButton={
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 ml-2 mt-2">
              <SlidersHorizontal />
            </Button>
          </SheetTrigger>
        }
      />
      <SheetContent className="flex flex-col h-[70vh]" side="bottom">
        <SheetHeader>
          <SheetTitle>필터</SheetTitle>
        </SheetHeader>
        <FilterContent
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
          onReset={onReset}
          showApplyButton
          onApply={() => setOpen(false)}
          initialTab={activeTab}
        />
      </SheetContent>
    </Sheet>
  );
};
