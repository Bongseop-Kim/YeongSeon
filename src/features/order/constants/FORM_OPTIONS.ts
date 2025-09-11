export const FABRIC_TYPES = [
  { value: "SILK", label: "실크" },
  { value: "POLY", label: "폴리" },
] as const;

export const DESIGN_TYPES = [
  { value: "YARN_DYED", label: "선염" },
  { value: "PRINTING", label: "날염" },
] as const;

export const PATTERN_TYPES = [
  { value: "BASIC", label: "기본" },
  { value: "TWILL", label: "트윌" },
  { value: "JACQUARD", label: "자카드" },
] as const;

export const TIE_TYPES = [
  { value: "MANUAL", label: "수동 봉제" },
  { value: "AUTO", label: "자동 봉제" },
] as const;

export const INTERLINING_TYPES = [
  { value: "POLY", label: "폴리 심지" },
  { value: "WOOL", label: "울 심지" },
] as const;

export const INTERLINING_THICKNESS = [
  { value: "THIN", label: "얇음" },
  { value: "THICK", label: "두꺼움" },
] as const;

export const SIZE_TYPES = [
  { value: "ADULT", label: "성인용" },
  { value: "CHILD", label: "아동용" },
] as const;

export const ADDITIONAL_OPTIONS = [
  {
    key: "triangleStitch",
    label: "삼각 봉제",
  },
  {
    key: "sideStitch",
    label: "옆선 봉제",
  },
  {
    key: "barTack",
    label: "바택 처리",
  },
  {
    key: "fold7",
    label: "7폴드",
  },
  {
    key: "dimple",
    label: "딤플",
  },
  {
    key: "spoderato",
    label: "스포데라토",
  },
] as const;

export const LABEL_OPTIONS = [
  {
    key: "brandLabel",
    label: "브랜드 라벨",
    description: "고객의 브랜드 라벨을 부착합니다",
  },
  {
    key: "careLabel",
    label: "케어 라벨",
    description: "세탁 방법 등의 케어 라벨을 부착합니다",
  },
] as const;

export const QUANTITY_CONFIG = {
  min: 4,
} as const;

export const TIE_WIDTH_CONFIG = {
  min: 6,
  max: 12,
  step: 0.5,
} as const;
