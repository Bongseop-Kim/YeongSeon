export interface CreateOrderItemInputDTO {
  item_id: string;
  item_type: "product" | "reform";
  product_id: number | null;
  selected_option_id: string | null;
  reform_data: {
    tie: {
      id: string;
      image?: string;
      fileId?: string;
      measurementType?: "length" | "height";
      tieLength?: number;
      wearerHeight?: number;
      notes?: string;
      checked?: boolean;
      dimple?: boolean;
      hasLengthReform?: boolean;
      hasWidthReform?: boolean;
      targetWidth?: number;
    };
    cost: number;
  } | null;
  quantity: number;
  applied_user_coupon_id: string | null;
}

interface CreateOrderDirectRepairShippingInputDTO {
  method: "direct";
  pickup?: null;
}

interface CreateOrderPickupRepairShippingInputDTO {
  method: "pickup";
  pickup: {
    recipient_name: string;
    recipient_phone: string;
    postal_code: string | null;
    address: string;
    detail_address: string | null;
  };
}

/** 수선품 발송 방식 — pickup(방문 수거)은 결제 전(주문 생성 시)에만 신청 가능 */
export type CreateOrderRepairShippingInputDTO =
  | CreateOrderDirectRepairShippingInputDTO
  | CreateOrderPickupRepairShippingInputDTO;

export interface CreateOrderInputDTO {
  shipping_address_id: string;
  items: CreateOrderItemInputDTO[];
  repair_shipping?: CreateOrderRepairShippingInputDTO | null;
}
