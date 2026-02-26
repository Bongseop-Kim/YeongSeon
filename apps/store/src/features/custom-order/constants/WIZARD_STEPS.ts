import type { StepConfig } from "@/features/custom-order/types/wizard";
import { QUANTITY_CONFIG, TIE_WIDTH_CONFIG } from "@/features/custom-order/constants/FORM_OPTIONS";

export const WIZARD_STEPS: StepConfig[] = [
  {
    id: "quantity",
    label: "수량",
    validate: (values) => {
      if (values.quantity < QUANTITY_CONFIG.min) {
        return `${QUANTITY_CONFIG.min}개 이상 주문 가능합니다`;
      }
      return null;
    },
    isSkippable: () => false,
  },
  {
    id: "fabric",
    label: "원단",
    validate: (values) => {
      if (values.fabricProvided || values.reorder) return null;
      if (!values.fabricType) return "원단 소재를 선택해주세요";
      if (!values.designType) return "디자인 방식을 선택해주세요";
      return null;
    },
    isSkippable: (values) => values.fabricProvided || values.reorder,
  },
  {
    id: "sewing",
    label: "봉제",
    validate: (values) => {
      if (!values.tieType) return "봉제 방식을 선택해주세요";
      return null;
    },
    isSkippable: () => false,
  },
  {
    id: "spec",
    label: "규격",
    validate: (values) => {
      if (values.tieWidth < TIE_WIDTH_CONFIG.min || values.tieWidth > TIE_WIDTH_CONFIG.max) {
        return `넥타이 폭은 ${TIE_WIDTH_CONFIG.min}~${TIE_WIDTH_CONFIG.max}cm 사이여야 합니다`;
      }
      return null;
    },
    isSkippable: () => true,
  },
  {
    id: "finishing",
    label: "마감",
    validate: () => null,
    isSkippable: () => true,
  },
  {
    id: "sample",
    label: "샘플",
    validate: (values) => {
      if (values.sample && !values.sampleType) {
        return "샘플 유형을 선택해주세요";
      }
      return null;
    },
    isSkippable: () => true,
  },
  {
    id: "attachment",
    label: "참고 자료",
    validate: () => null,
    isSkippable: () => true,
  },
  {
    id: "confirm",
    label: "확인",
    validate: () => null,
    isSkippable: () => false,
  },
];
