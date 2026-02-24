import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Search, XCircle } from "lucide-react";
import { useSearchStore, type DateFilterPreset } from "@/store/search";
import { DATE_PRESETS } from "@/constants/DATE_PRESETS";

export default function SearchSheet() {
  const {
    config,
    isSheetOpen,
    closeSheet,
    setQuery,
    setDatePreset,
    setCustomDateFrom,
    setCustomDateTo,
    executeSearch,
  } = useSearchStore();

  const formatDateForInput = (date?: Date) => {
    if (!date) return "";
    return date.toISOString().split("T")[0];
  };

  const handlePresetChange = (value: string) => {
    setDatePreset(value as DateFilterPreset);
  };

  const handleSearch = () => {
    executeSearch();
  };

  return (
    <Sheet open={isSheetOpen} onOpenChange={closeSheet}>
      <SheetContent className="bg-zinc-200 px-4 pt-4 pb-4" side="top">
        {/* 검색어 입력 */}

        <Input
          type="text"
          value={config.query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={config.placeholder}
          icon={
            config.query ? (
              <XCircle size={16} onClick={() => setQuery("")} />
            ) : (
              <Search size={16} />
            )
          }
          className="bg-white w-full"
        />

        {/* 기간 필터 */}
        <div className="space-y-3">
          {/* 퀵 버튼 */}
          <RadioGroup
            value={config.dateFilter.preset}
            onValueChange={handlePresetChange}
            className="grid grid-cols-4 gap-3"
          >
            {DATE_PRESETS.map((preset) => (
              <div key={preset.value} className="flex items-center">
                <RadioGroupItem
                  value={preset.value}
                  id={preset.value}
                  className="sr-only"
                />
                <Label
                  htmlFor={preset.value}
                  className={`flex-1 rounded-sm border-1 px-4 py-3 text-center bg-white ${
                    config.dateFilter.preset === preset.value
                      ? "border-primary font-bold"
                      : "border-border"
                  }`}
                >
                  {preset.label}
                </Label>
              </div>
            ))}
          </RadioGroup>

          {/* 직접 입력 */}
          <div className="flex gap-2 items-center">
            <Input
              id="date-from"
              type="date"
              value={formatDateForInput(config.dateFilter.customRange?.from)}
              onChange={(e) => setCustomDateFrom(e.target.value)}
              className="bg-white"
            />
            <span className="text-zinc-500">~</span>
            <Input
              id="date-to"
              type="date"
              value={formatDateForInput(config.dateFilter.customRange?.to)}
              onChange={(e) => setCustomDateTo(e.target.value)}
              className="bg-white"
            />
          </div>
        </div>

        <Button onClick={handleSearch}>검색</Button>
      </SheetContent>
    </Sheet>
  );
}
