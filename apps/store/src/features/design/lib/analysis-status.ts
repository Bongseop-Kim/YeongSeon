import {
  CI_PLACEMENT_OPTIONS,
  COLOR_OPTIONS,
  PATTERN_OPTIONS,
} from "@/features/design/constants/design-options";
import type { DesignContext } from "@/features/design/types/design-context";

const colorLabelMap = new Map(
  COLOR_OPTIONS.map((option) => [option.value.toLowerCase(), option.label]),
);
const patternLabelMap = new Map(
  PATTERN_OPTIONS.map((option) => [option.value, option.label]),
);
const placementLabelMap = new Map(
  CI_PLACEMENT_OPTIONS.map((option) => [option.value, option.label]),
);

const requirementLabelMap: Record<string, string> = {
  ciImage: "이미지 첨부 필요",
  referenceImage: "이미지 첨부 필요",
  sourceImage: "이미지 첨부 필요",
  baseImage: "수정할 기존 디자인 필요",
};

export function toAnalysisMissingRequirementLabels(
  missingRequirements: string[],
): string[] {
  return missingRequirements
    .map(
      (requirement) =>
        requirementLabelMap[requirement] ?? "추가 입력이 필요합니다",
    )
    .filter((label, index, labels) => labels.indexOf(label) === index);
}

export function toAnalysisSummaryChips(
  designContext: Pick<
    DesignContext,
    "colors" | "pattern" | "fabricMethod" | "ciPlacement"
  >,
): string[] {
  const chips: string[] = [];
  const primaryColor = designContext.colors[0]?.toLowerCase();

  if (primaryColor) {
    const colorLabel = colorLabelMap.get(primaryColor);
    if (colorLabel) {
      chips.push(colorLabel);
    }
  }

  if (designContext.pattern) {
    const patternLabel = patternLabelMap.get(designContext.pattern);
    if (patternLabel) {
      chips.push(patternLabel);
    }
  }

  if (designContext.ciPlacement) {
    const placementLabel = placementLabelMap.get(designContext.ciPlacement);
    if (placementLabel) {
      chips.push(placementLabel);
    }
  }

  return chips.slice(0, 3);
}
