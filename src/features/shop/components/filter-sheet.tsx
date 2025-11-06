import { useState } from "react";
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
import { ChevronDown, SlidersHorizontal } from "lucide-react";
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


  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <div className="flex">
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
        <SheetHeader className="sticky top-0 bg-background z-10 pb-4 border-b">
          <SheetTitle>필터</SheetTitle>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as FilterTab)} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="w-full justify-start mt-4 overflow-x-auto scrollbar-hidden">
            <TabsTrigger value="category">카테고리</TabsTrigger>
            <TabsTrigger value="price">가격</TabsTrigger>
            <TabsTrigger value="color">색상</TabsTrigger>
            <TabsTrigger value="pattern">패턴</TabsTrigger>
            <TabsTrigger value="material">소재</TabsTrigger>
          </TabsList>

          <TabsContent value="category" className="flex-1 overflow-y-auto mt-4">
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

          <TabsContent value="price" className="flex-1 overflow-y-auto mt-4">
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

          <TabsContent value="color" className="flex-1 overflow-y-auto mt-4">
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

          <TabsContent value="pattern" className="flex-1 overflow-y-auto mt-4">
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

          <TabsContent value="material" className="flex-1 overflow-y-auto mt-4">
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

        <div className="sticky bottom-0 bg-background pt-4 border-t">
          <Button variant="outline" className="w-full" onClick={onReset}>
            필터 초기화
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
