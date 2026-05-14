import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui-extended/select";
import { SORT_OPTIONS } from "@/features/shop/constants/FILTER_OPTIONS";
import type { SortOption } from "@yeongseon/shared/types/view/product";

interface SortSelectProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
}

export const SortSelect = ({ value, onChange }: SortSelectProps) => {
  return (
    <Select value={value} onValueChange={(val) => onChange(val as SortOption)}>
      <SelectTrigger
        className="h-8 w-[112px] rounded-lg border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 shadow-none"
        size="sm"
      >
        <SelectValue placeholder="정렬" />
      </SelectTrigger>
      <SelectContent>
        {SORT_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
