import { Button } from "@/shared/ui-extended/button";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import type { FilterTab } from "@/features/shop/types/filter";
import { cn } from "@/shared/lib/utils";

interface FilterButtonsProps {
  onFilterClick: (tab: FilterTab) => void;
  onMainButtonClick?: () => void;
  mainButton?: React.ReactNode;
  activeCounts?: Partial<Record<FilterTab, number>>;
  onReset?: () => void;
}

const LABELS: Record<FilterTab, string> = {
  category: "카테고리",
  price: "가격",
  color: "색상",
  pattern: "패턴",
  material: "소재",
};

const TABS = (Object.keys(LABELS) as FilterTab[]).map((key) => ({
  key,
  label: LABELS[key],
}));

export const FilterButtons = ({
  onFilterClick,
  onMainButtonClick,
  mainButton,
  activeCounts,
  onReset,
}: FilterButtonsProps) => {
  const hasActiveFilters = Object.values(activeCounts ?? {}).some(
    (count) => (count ?? 0) > 0,
  );

  return (
    <div className="flex w-full items-center gap-2">
      {mainButton ? (
        mainButton
      ) : onMainButtonClick ? (
        <Button variant="filter-chip" size="filter" onClick={onMainButtonClick}>
          <SlidersHorizontal className="size-4" />
          전체 필터
        </Button>
      ) : null}
      <div className="flex flex-1 gap-2 overflow-x-auto scrollbar-hidden">
        {TABS.map((tab) => {
          const count = activeCounts?.[tab.key] ?? 0;
          const isActive = count > 0;

          return (
            <Button
              key={tab.key}
              variant={isActive ? "filter-chip-active" : "filter-chip"}
              size="filter"
              aria-label={isActive ? `${tab.label} ${count}` : tab.label}
              onClick={() => onFilterClick(tab.key)}
            >
              <span>{tab.label}</span>
              {isActive ? (
                <span className="flex size-4 items-center justify-center rounded-full bg-white text-[10px] font-semibold leading-none text-zinc-900">
                  {count}
                </span>
              ) : null}
              <ChevronDown
                className={cn("size-4", isActive && "text-white/72")}
              />
            </Button>
          );
        })}
      </div>
      {onReset && hasActiveFilters ? (
        <Button
          type="button"
          variant="filter-reset"
          size="filter-reset"
          onClick={onReset}
        >
          초기화
        </Button>
      ) : null}
    </div>
  );
};
