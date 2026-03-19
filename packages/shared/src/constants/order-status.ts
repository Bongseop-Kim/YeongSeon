export type OrderType = "sale" | "custom" | "repair" | "token" | "sample";

export const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  sale: "일반 판매",
  custom: "주문 제작",
  repair: "수선",
  token: "토큰 구매",
  sample: "샘플 제작",
};

export const ORDER_STATUS_FLOW: Record<OrderType, Record<string, string>> = {
  sale: {
    대기중: "진행중",
    진행중: "배송중",
    배송중: "배송완료",
    배송완료: "완료",
  },
  custom: {
    대기중: "접수",
    접수: "제작중",
    제작중: "제작완료",
    제작완료: "배송중",
    배송중: "배송완료",
    배송완료: "완료",
  },
  repair: {
    대기중: "접수",
    접수: "수선중",
    수선중: "수선완료",
    수선완료: "배송중",
    배송중: "배송완료",
    배송완료: "완료",
  },
  token: { 대기중: "완료" },
  sample: {
    대기중: "접수",
    접수: "제작중",
    제작중: "배송중",
    배송중: "배송완료",
    배송완료: "완료",
  },
};

export const ORDER_ROLLBACK_FLOW: Record<OrderType, Record<string, string>> = {
  sale: { 진행중: "대기중" },
  custom: { 접수: "대기중", 제작중: "접수", 제작완료: "제작중" },
  repair: { 접수: "대기중", 수선중: "접수", 수선완료: "수선중" },
  token: {},
  sample: { 접수: "대기중", 제작중: "접수" },
};

export const ORDER_STATUS_COLORS: Record<string, string> = {
  대기중: "default",
  결제중: "warning",
  진행중: "processing",
  접수: "cyan",
  제작중: "orange",
  제작완료: "lime",
  수선중: "orange",
  수선완료: "lime",
  배송중: "blue",
  배송완료: "geekblue",
  완료: "success",
  취소: "error",
  실패: "error",
};

export const ORDER_STATUS_OPTIONS: Record<
  OrderType,
  { label: string; value: string }[]
> = {
  sale: [
    { label: "전체", value: "" },
    { label: "대기중", value: "대기중" },
    { label: "결제중", value: "결제중" },
    { label: "진행중", value: "진행중" },
    { label: "배송중", value: "배송중" },
    { label: "배송완료", value: "배송완료" },
    { label: "완료", value: "완료" },
    { label: "취소", value: "취소" },
  ],
  custom: [
    { label: "전체", value: "" },
    { label: "대기중", value: "대기중" },
    { label: "결제중", value: "결제중" },
    { label: "접수", value: "접수" },
    { label: "제작중", value: "제작중" },
    { label: "제작완료", value: "제작완료" },
    { label: "배송중", value: "배송중" },
    { label: "배송완료", value: "배송완료" },
    { label: "완료", value: "완료" },
    { label: "취소", value: "취소" },
  ],
  repair: [
    { label: "전체", value: "" },
    { label: "대기중", value: "대기중" },
    { label: "결제중", value: "결제중" },
    { label: "접수", value: "접수" },
    { label: "수선중", value: "수선중" },
    { label: "수선완료", value: "수선완료" },
    { label: "배송중", value: "배송중" },
    { label: "배송완료", value: "배송완료" },
    { label: "완료", value: "완료" },
    { label: "취소", value: "취소" },
  ],
  token: [
    { label: "전체", value: "" },
    { label: "대기중", value: "대기중" },
    { label: "결제중", value: "결제중" },
    { label: "완료", value: "완료" },
    { label: "실패", value: "실패" },
    { label: "취소", value: "취소" },
  ],
  sample: [
    { label: "전체", value: "" },
    { label: "대기중", value: "대기중" },
    { label: "결제중", value: "결제중" },
    { label: "접수", value: "접수" },
    { label: "제작중", value: "제작중" },
    { label: "배송중", value: "배송중" },
    { label: "배송완료", value: "배송완료" },
    { label: "완료", value: "완료" },
    { label: "취소", value: "취소" },
  ],
};
