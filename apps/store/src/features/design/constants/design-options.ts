import type {
  FabricMethod,
  PatternOption,
} from "@/features/design/types/design-context";

export interface ColorOption {
  label: string;
  value: string;
}

export interface PatternSelectionOption {
  label: string;
  value: PatternOption;
}

export interface FabricOption {
  label: string;
  value: FabricMethod;
  description: string;
}

export const COLOR_OPTIONS: ColorOption[] = [
  { label: "네이비", value: "#1a2c5b" },
  { label: "버건디", value: "#8B0000" },
  { label: "포레스트 그린", value: "#2c5f2e" },
  { label: "샴페인 골드", value: "#c8a96e" },
  { label: "차콜", value: "#4a4a4a" },
  { label: "화이트", value: "#e8e8e4" },
  { label: "라벤더", value: "#7b6fa0" },
  { label: "테라코타", value: "#c17f5a" },
  { label: "스틸 블루", value: "#4a7fa5" },
  { label: "에메랄드", value: "#2d6a4f" },
  { label: "플럼", value: "#6b3a5e" },
  { label: "다크 골드", value: "#b8860b" },
];

export const PATTERN_OPTIONS: PatternSelectionOption[] = [
  { label: "스트라이프", value: "stripe" },
  { label: "도트", value: "dot" },
  { label: "체크", value: "check" },
  { label: "하운즈투스", value: "houndstooth" },
  { label: "페이즐리", value: "paisley" },
  { label: "플로럴", value: "floral" },
  { label: "솔리드", value: "plain" },
  { label: "커스텀", value: "custom" },
];

export const FABRIC_OPTIONS: FabricOption[] = [
  {
    label: "선염 (직조)",
    value: "yarn-dyed",
    description: "실을 먼저 염색 후 직조. 패턴이 원단 깊이 표현됨",
  },
  {
    label: "날염 (프린팅)",
    value: "print",
    description: "완성 원단에 패턴 인쇄. 복잡한 이미지 표현 가능",
  },
];
