import type { ClaimTypeDTO } from "../types/dto/claim-view";

export const CLAIM_STATUS_FLOW: Record<
  ClaimTypeDTO,
  Record<string, string>
> = {
  cancel: { 접수: "처리중", 처리중: "완료" },
  return: { 접수: "수거요청", 수거요청: "수거완료", 수거완료: "완료" },
  exchange: {
    접수: "수거요청",
    수거요청: "수거완료",
    수거완료: "재발송",
    재발송: "완료",
  },
};

export const CLAIM_STATUS_COLORS: Record<string, string> = {
  접수: "default",
  처리중: "processing",
  수거요청: "orange",
  수거완료: "lime",
  재발송: "blue",
  완료: "success",
  거부: "error",
};

export const CLAIM_STATUS_OPTIONS: { label: string; value: string }[] = [
  { label: "접수", value: "접수" },
  { label: "처리중", value: "처리중" },
  { label: "수거요청", value: "수거요청" },
  { label: "수거완료", value: "수거완료" },
  { label: "재발송", value: "재발송" },
  { label: "완료", value: "완료" },
  { label: "거부", value: "거부" },
];

export const CLAIM_TYPE_LABELS: Record<ClaimTypeDTO, string> = {
  cancel: "취소",
  return: "반품",
  exchange: "교환",
};

export const CLAIM_REASON_LABELS: Record<string, string> = {
  change_mind: "단순변심",
  defect: "불량/파손",
  delay: "배송지연",
  wrong_item: "오배송",
  size_mismatch: "사이즈 불일치",
  color_mismatch: "색상 불일치",
  other: "기타",
};
