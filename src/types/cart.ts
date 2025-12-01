import type { Product, ProductOption } from "@/features/shop/types/product";
import type { Coupon } from "./coupon";
import type { TieItem } from "@/features/reform/types/reform";

export interface ProductCartItem {
  id: string;
  type: "product";
  product: Product;
  selectedOption?: ProductOption;
  quantity: number;
  appliedCoupon?: Coupon;
}

export interface ReformCartItem {
  id: string;
  type: "reform";
  quantity: number; // 항상 1 (개별 넥타이)
  reformData: {
    tie: TieItem;
    cost: number;
  };
  appliedCoupon?: Coupon;
}

export type CartItem = ProductCartItem | ReformCartItem;

export interface CartSummary {
  totalItems: number;
  totalPrice: number;
  items: CartItem[];
}
