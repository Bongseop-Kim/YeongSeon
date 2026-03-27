import { useState } from "react";
import { Button } from "@/components/ui-extended/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui-extended/sheet";
import { FilterContent } from "./filter-content";
import { FilterButtons } from "./filter-buttons";
import { SlidersHorizontal } from "lucide-react";
import {
  type ProductCategory,
  type ProductColor,
  type ProductPattern,
  type ProductMaterial,
} from "@yeongseon/shared/types/view/product";
import type { FilterTab } from "@/features/shop/types/filter";

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
  activeCounts?: Partial<Record<FilterTab, number>>;
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
  activeCounts,
}: FilterSheetProps) => {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>(initialTab);

  const handleFilterButtonClick = (tab: FilterTab) => {
    setActiveTab(tab);
    setOpen(true);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <FilterButtons
        onFilterClick={handleFilterButtonClick}
        activeCounts={activeCounts}
        mainButton={
          <SheetTrigger asChild>
            <Button
              variant="none"
              size="sm"
              className="h-9 gap-2 rounded-full border border-zinc-200 bg-white px-3 text-zinc-700 shadow-none"
            >
              <SlidersHorizontal />
              필터
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
