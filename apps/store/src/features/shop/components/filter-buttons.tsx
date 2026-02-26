import { Button } from "@/components/ui/button";
import { ChevronDown, SlidersHorizontal } from "lucide-react";

type FilterTab = "category" | "price" | "color" | "pattern" | "material";

interface FilterButtonsProps {
  onFilterClick: (tab: FilterTab) => void;
  onMainButtonClick?: () => void;
  mainButton?: React.ReactNode;
}

export const FilterButtons = ({
  onFilterClick,
  onMainButtonClick,
  mainButton,
}: FilterButtonsProps) => {
  return (
    <div className="sticky top-14 z-40 bg-background">
      <div className="max-w-7xl mx-auto flex">
      {mainButton ? (
        mainButton
      ) : onMainButtonClick ? (
        <Button
          variant="outline"
          size="sm"
          className="gap-2 ml-2 mt-2"
          onClick={onMainButtonClick}
        >
          <SlidersHorizontal />
        </Button>
      ) : (
        <div className="ml-2 mt-2" />
      )}
      <div className="flex gap-2 m-2 overflow-x-auto scrollbar-hidden">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onFilterClick("category")}
        >
          카테고리
          <ChevronDown />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onFilterClick("price")}
        >
          가격
          <ChevronDown />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onFilterClick("color")}
        >
          색상
          <ChevronDown />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onFilterClick("pattern")}
        >
          패턴
          <ChevronDown />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onFilterClick("material")}
        >
          소재
          <ChevronDown />
        </Button>
      </div>
      </div>
    </div>
  );
};
