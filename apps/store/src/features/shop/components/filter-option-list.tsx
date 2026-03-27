import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface FilterOptionListProps<T extends string> {
  options: ReadonlyArray<{
    value: T;
    label: string;
    colorCode?: string;
    [key: string]: unknown;
  }>;
  checked: (value: T) => boolean;
  onCheckedChange: (value: T) => void;
  idPrefix: string;
}

function FilterOptionList<T extends string>({
  options,
  checked,
  onCheckedChange,
  idPrefix,
}: FilterOptionListProps<T>) {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-4 px-4 sm:grid-cols-2">
      {options.map((option) => (
        <div key={option.value} className="flex items-center gap-3 pb-4">
          <Checkbox
            id={`${idPrefix}-${option.value}`}
            checked={checked(option.value)}
            onCheckedChange={() => onCheckedChange(option.value)}
          />
          <Label
            htmlFor={`${idPrefix}-${option.value}`}
            className="flex cursor-pointer items-center gap-2 text-sm text-zinc-800"
          >
            {option.colorCode && (
              <div
                className="h-4 w-4 rounded-full border border-zinc-300"
                style={{ backgroundColor: option.colorCode }}
              />
            )}
            {option.label}
          </Label>
        </div>
      ))}
    </div>
  );
}

export default FilterOptionList;
