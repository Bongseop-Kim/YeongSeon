import { RadioCard } from "@/components/composite/radio-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PACKAGE_PRESETS } from "@/features/custom-order/constants/PACKAGE_PRESETS";
import { calculateTotalCost } from "@/features/custom-order/utils/pricing";
import type { OrderOptions } from "@/features/custom-order/types/order";
import type { PricingConfig } from "@/features/custom-order/types/pricing";
import type { PackagePreset } from "@/features/custom-order/types/wizard";
import { Badge } from "@/components/ui/badge";
import { RadioGroup } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";

interface PackageSelectorProps {
  quantity: number;
  isLoggedIn: boolean;
  selectedPackage: PackagePreset | null;
  onSelectPackage: (preset: PackagePreset) => void;
  pricingConfig: PricingConfig | undefined;
}

const OPTION_LABELS = {
  fabricType: (v: OrderOptions["fabricType"] | undefined) =>
    v === "SILK" ? "실크" : "폴리",
  designType: (v: OrderOptions["designType"] | undefined) =>
    v === "YARN_DYED" ? "선염" : "날염",
  tieType: (v: OrderOptions["tieType"] | undefined) =>
    v === "AUTO" ? "자동 타이 (지퍼)" : "수동 타이 (손매듭)",
  interlining: (v: OrderOptions["interlining"] | undefined) =>
    v === "WOOL" ? "울 심지" : "심지 없음",
} as const;

export const PackageSelector = ({
  quantity,
  isLoggedIn,
  selectedPackage,
  onSelectPackage,
  pricingConfig,
}: PackageSelectorProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>패키지로 빠르게 시작하기</CardTitle>
      </CardHeader>

      <CardContent>
        <RadioGroup
          value={selectedPackage ?? ""}
          onValueChange={(v) => onSelectPackage(v as PackagePreset)}
        >
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            {PACKAGE_PRESETS.map((preset) => {
              const isSelected = selectedPackage === preset.id;

              const packageOptions: OrderOptions = {
                fabricProvided: false,
                reorder: false,
                fabricType: preset.values.fabricType ?? "POLY",
                designType: preset.values.designType ?? "PRINTING",
                tieType: preset.values.tieType ?? null,
                interlining: preset.values.interlining ?? null,
                interliningThickness:
                  preset.values.interliningThickness ?? "THICK",
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
              const packageCost =
                isLoggedIn && pricingConfig
                  ? calculateTotalCost(packageOptions, pricingConfig).totalCost
                  : null;

              return (
                <RadioCard
                  key={preset.id}
                  value={preset.id}
                  id={`package-${preset.id}`}
                  selected={isSelected}
                  className="text-left"
                >
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 min-h-6 justify-between">
                      {preset.name}
                      {preset.badge && <Badge>{preset.badge}</Badge>}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1 text-xs text-zinc-500 h-20">
                      <p>
                        {OPTION_LABELS.fabricType(preset.values.fabricType)} ·{" "}
                        {OPTION_LABELS.designType(preset.values.designType)}
                      </p>
                      <p>{OPTION_LABELS.tieType(preset.values.tieType)}</p>
                      <p>
                        {OPTION_LABELS.interlining(preset.values.interlining)}
                      </p>
                      {(preset.values.brandLabel ||
                        preset.values.careLabel) && (
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
                    <Separator />
                    <div>
                      <CardTitle>
                        {packageCost != null
                          ? `${packageCost.toLocaleString()}원`
                          : "가격 정보 없음"}
                      </CardTitle>
                      <span className="text-xs text-zinc-500">
                        {preset.tagline}
                      </span>
                    </div>
                  </CardContent>
                </RadioCard>
              );
            })}
          </div>
        </RadioGroup>
      </CardContent>
    </Card>
  );
};
