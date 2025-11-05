export const CATEGORY_OPTIONS = [
  { value: "formal", label: "정장용" },
  { value: "casual", label: "캐주얼" },
  { value: "wedding", label: "웨딩" },
  { value: "business", label: "비즈니스" },
] as const;

export const COLOR_OPTIONS = [
  { value: "black", label: "블랙", colorCode: "#000000" },
  { value: "navy", label: "네이비", colorCode: "#001f3f" },
  { value: "gray", label: "그레이", colorCode: "#808080" },
  { value: "wine", label: "와인", colorCode: "#722f37" },
  { value: "blue", label: "블루", colorCode: "#0074D9" },
  { value: "brown", label: "브라운", colorCode: "#654321" },
  { value: "beige", label: "베이지", colorCode: "#f5f5dc" },
  { value: "silver", label: "실버", colorCode: "#c0c0c0" },
] as const;

export const PATTERN_OPTIONS = [
  { value: "solid", label: "무지" },
  { value: "stripe", label: "스트라이프" },
  { value: "dot", label: "도트" },
  { value: "check", label: "체크" },
  { value: "paisley", label: "페이즐리" },
] as const;

export const MATERIAL_OPTIONS = [
  { value: "silk", label: "실크" },
  { value: "cotton", label: "면" },
  { value: "polyester", label: "폴리에스터" },
  { value: "wool", label: "울" },
] as const;

export const PRICE_RANGE_OPTIONS = [
  { value: "all", label: "전체", min: 0, max: Infinity },
  { value: "under-30", label: "3만원 이하", min: 0, max: 29999 },
  { value: "30-50", label: "3만원 ~ 5만원", min: 30000, max: 49999 },
  { value: "50-70", label: "5만원 ~ 7만원", min: 50000, max: 69999 },
  { value: "over-70", label: "7만원 이상", min: 70000, max: Infinity },
] as const;

export const SORT_OPTIONS = [
  { value: "latest", label: "최신순" },
  { value: "price-low", label: "낮은 가격순" },
  { value: "price-high", label: "높은 가격순" },
  { value: "popular", label: "인기순" },
] as const;
