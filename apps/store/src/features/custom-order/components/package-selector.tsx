import { RadioChoiceField } from "@/shared/composite/radio-choice-field";
import { PACKAGE_PRESETS } from "@/features/custom-order/constants/PACKAGE_PRESETS";
import { calculateTotalCost } from "@/features/custom-order/utils/pricing";
import type { OrderOptions } from "@/features/custom-order/types/order";
import type { PricingConfig } from "@/features/custom-order/types/pricing";
import type { PackagePreset } from "@/features/custom-order/types/wizard";
import { Badge } from "@/shared/ui/badge";
import { RadioGroup } from "@/shared/ui/radio-group";
import { Field, FieldTitle, FieldDescription } from "@/shared/ui/field";

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
      <Field className="max-w-2xl">
        <FieldTitle>패키지로 빠르게 시작하기</FieldTitle>
        <FieldDescription>
          자주 선택하는 구성을 먼저 고른 뒤 세부 옵션만 조정할 수 있습니다.
        </FieldDescription>
      </Field>

      <div className="mt-5">
        <RadioGroup
          value={selectedPackage ?? ""}
          onValueChange={(v: string) => onSelectPackage(v as PackagePreset)}
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
                <RadioChoiceField
                  key={preset.id}
                  value={preset.id}
                  id={`package-${preset.id}`}
                  selected={isSelected}
                  variant="panel"
                  className="text-left"
                  title={preset.name}
                  description={preset.tagline}
                  badge={
                    preset.badge ? (
                      <Badge className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-secondary-foreground shadow-none">
                        {preset.badge}
                      </Badge>
                    ) : null
                  }
                  meta={
                    <>
                      <span>
                        소재{" "}
                        {OPTION_LABELS.fabricType(preset.values.fabricType)} ·{" "}
                        {OPTION_LABELS.designType(preset.values.designType)}
                      </span>
                      <span>
                        타이 종류 {OPTION_LABELS.tieType(preset.values.tieType)}
                      </span>
                      <span>
                        심지{" "}
                        {OPTION_LABELS.interlining(preset.values.interlining)}
                      </span>
                      {(preset.values.brandLabel ||
                        preset.values.careLabel) && (
                        <span>
                          라벨{" "}
                          {[
                            preset.values.brandLabel && "브랜드",
                            preset.values.careLabel && "케어",
                          ]
                            .filter(Boolean)
                            .join(" + ")}
                        </span>
                      )}
                    </>
                  }
                  footer={
                    <div className="flex items-end justify-between gap-4">
                      <div>
                        <p className="text-xs font-medium text-foreground-muted">
                          예상
                        </p>
                        <p className="mt-1 text-xs text-foreground-muted">
                          {quantity}개 기준
                        </p>
                      </div>
                      <p className="text-right text-xl font-semibold text-foreground">
                        {packageCost != null
                          ? `${packageCost.toLocaleString()}원`
                          : "가격 정보 없음"}
                      </p>
                    </div>
                  }
                />
              );
            })}
          </div>
        </RadioGroup>
      </div>
    </section>
  );
};
