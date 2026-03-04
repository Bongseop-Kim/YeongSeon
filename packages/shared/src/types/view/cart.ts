import type { OrderItem } from "./order";

export type CartItem = OrderItem;

// 이전 타입 호환성을 위한 별칭
export type ProductCartItem = Extract<CartItem, { type: "product" }>;
export type ReformCartItem = Extract<CartItem, { type: "reform" }>;
