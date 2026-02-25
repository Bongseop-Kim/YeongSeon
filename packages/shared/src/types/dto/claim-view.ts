import type { ProductDTO, ProductOptionDTO } from "./product";
import type { TieItemDTO } from "./reform";
import type { AppliedCouponDTO } from "./coupon";

export type ClaimStatusDTO = "접수" | "처리중" | "수거요청" | "수거완료" | "재발송" | "완료" | "거부";
export type ClaimTypeDTO = "cancel" | "return" | "exchange";

/** claim_list_view의 item jsonb 컬럼 shape */
export interface ClaimItemRowDTO {
  id: string;
  type: "product" | "reform";
  product: ProductDTO | null;
  selectedOption: ProductOptionDTO | null;
  quantity: number;
  reformData: { tie: TieItemDTO; cost: number } | null;
  appliedCoupon: AppliedCouponDTO | null;
}

/** claim_list_view 전체 row */
export interface ClaimListRowDTO {
  id: string;
  claimNumber: string;
  date: string;
  status: ClaimStatusDTO;
  type: ClaimTypeDTO;
  reason: string;
  description: string | null;
  claimQuantity: number;
  orderId: string;
  orderNumber: string;
  orderDate: string;
  item: ClaimItemRowDTO;
}
