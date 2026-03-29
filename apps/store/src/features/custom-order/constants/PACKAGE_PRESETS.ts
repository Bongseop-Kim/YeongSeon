import type { OrderOptions } from "@/entities/custom-order";
import type { PackagePreset } from "@/features/custom-order/types/wizard";

interface PackagePresetConfig {
  id: PackagePreset;
  name: string;
  tagline: string;
  badge: string | null;
  values: Partial<OrderOptions>;
}

export const PACKAGE_PRESETS: PackagePresetConfig[] = [
  {
    id: "basic",
    name: "실용",
    tagline: "가장 경제적",
    badge: null,
    values: {
      fabricType: "POLY",
      designType: "PRINTING",
      tieType: null,
      dimple: false,
      spoderato: false,
      fold7: false,
      interlining: null,
      interliningThickness: "THICK",
      triangleStitch: true,
      sideStitch: true,
      brandLabel: false,
      careLabel: false,
    },
  },
  {
    id: "recommended",
    name: "추천",
    tagline: "가장 인기",
    badge: "BEST",
    values: {
      fabricType: "SILK",
      designType: "PRINTING",
      tieType: null,
      dimple: false,
      spoderato: false,
      fold7: false,
      interlining: null,
      interliningThickness: "THICK",
      triangleStitch: true,
      sideStitch: true,
      brandLabel: false,
      careLabel: true,
    },
  },
  {
    id: "premium",
    name: "프리미엄",
    tagline: "최고급 마감",
    badge: null,
    values: {
      fabricType: "SILK",
      designType: "YARN_DYED",
      tieType: "AUTO",
      dimple: true,
      spoderato: false,
      fold7: false,
      interlining: "WOOL",
      interliningThickness: "THICK",
      triangleStitch: true,
      sideStitch: true,
      brandLabel: true,
      careLabel: true,
    },
  },
];
