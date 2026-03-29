import { Button } from "@/shared/ui-extended/button";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import type { FilterTab } from "@/features/shop/types/filter";
import { cn } from "@/shared/lib/utils";

interface FilterButtonsProps {
  onFilterClick: (tab: FilterTab) => void;
  onMainButtonClick?: () => void;
  mainButton?: React.ReactNode;
  activeCounts?: Partial<Record<FilterTab, number>>;
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
}: FilterButtonsProps) => {
  return (
    <div className="w-full">
      <div className="flex items-center gap-2">
        {mainButton ? (
          mainButton
        ) : onMainButtonClick ? (
          <Button
            variant="none"
            size="sm"
            className="h-9 gap-2 rounded-full border border-zinc-200 bg-white px-3 text-zinc-700 shadow-none"
            onClick={onMainButtonClick}
          >
            <SlidersHorizontal />
            필터
          </Button>
        ) : null}
        <div className="flex flex-1 gap-2 overflow-x-auto scrollbar-hidden">
          {TABS.map((tab) => {
            const count = activeCounts?.[tab.key] ?? 0;

            return (
              <Button
                key={tab.key}
                variant="none"
                size="sm"
                className={cn(
                  "h-9 rounded-full border px-3 text-sm shadow-none transition-colors",
                  count > 0
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50",
                )}
                onClick={() => onFilterClick(tab.key)}
              >
                <span>{tab.label}</span>
                {count > 0 ? (
                  <span className="text-[11px] text-white/72">{count}</span>
                ) : null}
                <ChevronDown
                  className={cn("size-4", count > 0 && "text-white/72")}
                />
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
