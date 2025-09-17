export interface OrderOptions {
  // 원단 정보
  fabricProvided: boolean;
  reorder: boolean;
  fabricType: "SILK" | "POLY" | null;
  designType: "PRINTING" | "YARN_DYED" | null;

  // 제작 옵션
  tieType: "MANUAL" | "AUTO" | null;
  interlining: "POLY" | "WOOL" | null;
  interliningThickness: "THICK" | "THIN" | null;
  sizeType: "ADULT" | "CHILD" | null;
  tieWidth: number;

  // 추가 옵션
  triangleStitch: boolean;
  sideStitch: boolean;
  barTack: boolean;
  fold7: boolean;
  dimple: boolean;
  spoderato: boolean;

  // 라벨 옵션
  brandLabel: boolean;
  careLabel: boolean;

  // 주문 정보
  quantity: number;
  referenceImages: File[] | null;
  additionalNotes: string;
  sample: boolean;
}
