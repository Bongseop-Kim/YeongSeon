export const REPAIR_SHIPPING_ADDRESS = {
  recipient: "영선산업",
  address: "대전광역시 동구 우암로246번길 9-16 (가양동) 영선산업",
  phone: "042-626-9055",
} as const;

// 송장 없는 접수 사유는 DB check 제약과 공유하므로 packages/shared가 단일 소스
export {
  REPAIR_NO_TRACKING_REASONS,
  type RepairNoTrackingReason,
} from "@yeongseon/shared/constants/repair-shipping";

// 방문 수거비는 pricing_constants(REFORM_PICKUP_FEE)에서 조회한다 — useReformPricing().pickupFee
