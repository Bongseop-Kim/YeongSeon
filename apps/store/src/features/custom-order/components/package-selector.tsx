import { RadioCard } from "@/components/composite/radio-card";
import { PACKAGE_PRESETS } from "@/features/custom-order/constants/PACKAGE_PRESETS";
import { calculateTotalCost } from "@/features/custom-order/utils/pricing";
import type { OrderOptions } from "@/features/custom-order/types/order";
import type { PricingConfig } from "@/features/custom-order/types/pricing";
import type { PackagePreset } from "@/features/custom-order/types/wizard";
import { Badge } from "@/components/ui/badge";
import { RadioGroup } from "@/components/ui/radio-group";

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
    <section className="border-t border-stone-200 pt-8">
      <div className="max-w-2xl">
        <h3 className="text-lg font-semibold tracking-tight text-zinc-950">
          패키지로 빠르게 시작하기
        </h3>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          자주 선택하는 구성을 먼저 고른 뒤 세부 옵션만 조정할 수 있습니다.
        </p>
      </div>

      <div className="mt-5">
        <RadioGroup
          value={selectedPackage ?? ""}
          onValueChange={(v) => onSelectPackage(v as PackagePreset)}
        >
          <div className="grid grid-cols-1 gap-3">
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
                  <div className="flex flex-col gap-4 p-5 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-base font-semibold text-zinc-950">
                          {preset.name}
                        </h4>
                        {preset.badge ? (
                          <Badge className="rounded-full px-2 py-0.5 text-[11px]">
                            {preset.badge}
                          </Badge>
                        ) : null}
                      </div>

                      <p className="text-sm leading-6 text-zinc-600">
                        {preset.tagline}
                      </p>

                      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-zinc-500">
                        <p>
                          소재{" "}
                          <span className="text-zinc-700">
                            {OPTION_LABELS.fabricType(preset.values.fabricType)}{" "}
                            ·{" "}
                            {OPTION_LABELS.designType(preset.values.designType)}
                          </span>
                        </p>
                        <p>
                          봉제{" "}
                          <span className="text-zinc-700">
                            {OPTION_LABELS.tieType(preset.values.tieType)}
                          </span>
                        </p>
                        <p>
                          심지{" "}
                          <span className="text-zinc-700">
                            {OPTION_LABELS.interlining(
                              preset.values.interlining,
                            )}
                          </span>
                        </p>
                        {(preset.values.brandLabel ||
                          preset.values.careLabel) && (
                          <p>
                            라벨{" "}
                            <span className="text-zinc-700">
                              {[
                                preset.values.brandLabel && "브랜드",
                                preset.values.careLabel && "케어",
                              ]
                                .filter(Boolean)
                                .join(" + ")}
                            </span>
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 border-t border-stone-200 pt-4 md:min-w-40 md:border-t-0 md:border-l md:pl-6 md:pt-0 md:text-right">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
                        Estimated
                      </p>
                      <p className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">
                        {packageCost != null
                          ? `${packageCost.toLocaleString()}원`
                          : "가격 정보 없음"}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {quantity}개 기준
                      </p>
                    </div>
                  </div>
                </RadioCard>
              );
            })}
          </div>
        </RadioGroup>
      </div>
    </section>
  );
};
