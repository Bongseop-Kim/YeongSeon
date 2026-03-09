import type { ProductOrderItem, ReformOrderItem } from "./order";

// 카트에는 일반 상품과 수선만 담긴다. 주문 제작은 별도 플로우(create_custom_order_txn)로 생성된다.
export type CartItem = ProductOrderItem | ReformOrderItem;

export type ProductCartItem = ProductOrderItem;
export type ReformCartItem = ReformOrderItem;
