import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { PACKAGE_PRESETS } from "@/features/custom-order/constants/PACKAGE_PRESETS";
import { calculateTotalCost } from "@/features/custom-order/utils/pricing";
import type { OrderOptions } from "@/features/custom-order/types/order";
import type { PackagePreset } from "@/features/custom-order/types/wizard";

interface PackageSelectorProps {
  quantity: number;
  isLoggedIn: boolean;
  selectedPackage: PackagePreset | null;
  onSelectPackage: (preset: PackagePreset) => void;
}

const OPTION_LABELS: Record<string, (v: unknown) => string> = {
  fabricType: (v) => (v === "SILK" ? "실크" : "폴리"),
  designType: (v) => (v === "YARN_DYED" ? "선염" : "날염"),
  tieType: (v) => (v === "AUTO" ? "자동 봉제" : "수동 봉제"),
  interlining: (v) => (v === "WOOL" ? "울 심지" : "폴리 심지"),
};

export const PackageSelector = ({
  quantity,
  isLoggedIn,
  selectedPackage,
  onSelectPackage,
}: PackageSelectorProps) => {
  return (
    <div>
      <h3 className="text-sm font-medium text-zinc-900 mb-3">
        패키지로 빠르게 시작하기
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {PACKAGE_PRESETS.map((preset) => {
          const isSelected = selectedPackage === preset.id;

          const packageCost = isLoggedIn
            ? calculateTotalCost({
                fabricProvided: false,
                reorder: false,
                quantity,
                referenceImages: null,
                additionalNotes: "",
                sample: false,
                sampleType: null,
                sizeType: "ADULT",
                tieWidth: 8,
                barTack: false,
                ...preset.values,
              } as OrderOptions).totalCost
            : null;

          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelectPackage(preset.id)}
              className="text-left"
            >
              <Card
                className={cn(
                  "transition-colors h-full",
                  isSelected
                    ? "border-zinc-900 ring-1 ring-zinc-900"
                    : "hover:border-zinc-400"
                )}
              >
                <CardContent className="pt-4 pb-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-zinc-900">
                      {preset.name}
                    </span>
                    {preset.badge && (
                      <span className="text-[10px] font-semibold bg-zinc-900 text-white px-1.5 py-0.5 rounded">
                        {preset.badge}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 text-xs text-zinc-500">
                    <p>
                      {OPTION_LABELS.fabricType(preset.values.fabricType)} ·{" "}
                      {OPTION_LABELS.designType(preset.values.designType)}
                    </p>
                    <p>{OPTION_LABELS.tieType(preset.values.tieType)}</p>
                    <p>{OPTION_LABELS.interlining(preset.values.interlining)}</p>
                    {(preset.values.brandLabel || preset.values.careLabel) && (
                      <p>
                        {[
                          preset.values.brandLabel && "브랜드 라벨",
                          preset.values.careLabel && "케어 라벨",
                        ]
                          .filter(Boolean)
                          .join(" + ")}
                      </p>
                    )}
                  </div>

                  <div className="pt-1 border-t border-zinc-100">
                    {packageCost !== null ? (
                      <span className="text-sm font-medium text-zinc-900">
                        {packageCost.toLocaleString()}원
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-400">
                        {preset.tagline}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </button>
          );
        })}
      </div>
    </div>
  );
};
