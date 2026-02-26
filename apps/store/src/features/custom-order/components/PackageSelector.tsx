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

const OPTION_LABELS = {
  fabricType: (v: OrderOptions["fabricType"]) => (v === "SILK" ? "실크" : "폴리"),
  designType: (v: OrderOptions["designType"]) => (v === "YARN_DYED" ? "선염" : "날염"),
  tieType: (v: OrderOptions["tieType"]) => (v === "AUTO" ? "자동 봉제" : "수동 봉제"),
  interlining: (v: OrderOptions["interlining"]) => (v === "WOOL" ? "울 심지" : "폴리 심지"),
} as const;

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

          const packageOptions: OrderOptions = {
            fabricProvided: false,
            reorder: false,
            fabricType: preset.values.fabricType ?? "POLY",
            designType: preset.values.designType ?? "PRINTING",
            tieType: preset.values.tieType ?? "MANUAL",
            interlining: preset.values.interlining ?? "POLY",
            interliningThickness: preset.values.interliningThickness ?? "THICK",
            sizeType: "ADULT",
            tieWidth: 8,
            triangleStitch: preset.values.triangleStitch ?? true,
            sideStitch: preset.values.sideStitch ?? true,
            barTack: preset.values.barTack ?? false,
            fold7: preset.values.fold7 ?? false,
            dimple: preset.values.dimple ?? false,
            spoderato: preset.values.spoderato ?? false,
            brandLabel: preset.values.brandLabel ?? false,
            careLabel: preset.values.careLabel ?? false,
            quantity,
            referenceImages: null,
            additionalNotes: "",
            sample: false,
            sampleType: null,
          };
          const packageCost = isLoggedIn
            ? calculateTotalCost(packageOptions).totalCost
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
