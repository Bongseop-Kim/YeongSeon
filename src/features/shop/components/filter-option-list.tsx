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
    <div className="px-2 grid grid-cols-2 gap-x-6 gap-y-4">
      {options.map((option) => (
        <div key={option.value} className="flex items-center space-x-2">
          <Checkbox
            id={`${idPrefix}-${option.value}`}
            checked={checked(option.value)}
            onCheckedChange={() => onCheckedChange(option.value)}
          />
          <Label
            htmlFor={`${idPrefix}-${option.value}`}
            className="text-sm cursor-pointer flex items-center gap-2"
          >
            {option.colorCode && (
              <div
                className="w-4 h-4 rounded-full border border-zinc-300"
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
