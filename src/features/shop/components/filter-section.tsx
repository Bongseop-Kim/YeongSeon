import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  CATEGORY_OPTIONS,
  COLOR_OPTIONS,
  PATTERN_OPTIONS,
  MATERIAL_OPTIONS,
  PRICE_RANGE_OPTIONS,
} from "../constants/FILTER_OPTIONS";
import {
  ProductCategory,
  ProductColor,
  ProductPattern,
  ProductMaterial,
} from "../types/product";

interface FilterSectionProps {
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
}

export const FilterSection = ({
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
}: FilterSectionProps) => {
  return (
    <div className="w-full">
      <Accordion type="multiple" defaultValue={["category", "price", "color", "pattern", "material"]}>
        {/* 카테고리 필터 */}
        <AccordionItem value="category">
          <AccordionTrigger className="text-sm font-semibold">
            카테고리
          </AccordionTrigger>
          <AccordionContent>
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
          </AccordionContent>
        </AccordionItem>

        {/* 가격대 필터 */}
        <AccordionItem value="price">
          <AccordionTrigger className="text-sm font-semibold">
            가격대
          </AccordionTrigger>
          <AccordionContent>
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
          </AccordionContent>
        </AccordionItem>

        {/* 색상 필터 */}
        <AccordionItem value="color">
          <AccordionTrigger className="text-sm font-semibold">
            색상
          </AccordionTrigger>
          <AccordionContent>
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
          </AccordionContent>
        </AccordionItem>

        {/* 패턴 필터 */}
        <AccordionItem value="pattern">
          <AccordionTrigger className="text-sm font-semibold">
            패턴
          </AccordionTrigger>
          <AccordionContent>
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
          </AccordionContent>
        </AccordionItem>

        {/* 소재 필터 */}
        <AccordionItem value="material">
          <AccordionTrigger className="text-sm font-semibold">
            소재
          </AccordionTrigger>
          <AccordionContent>
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
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};
