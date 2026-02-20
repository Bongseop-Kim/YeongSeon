import type { Product, ProductOption } from "@/features/shop/types/view/product";
import type { AppliedCoupon, Coupon } from "@/features/order/types/coupon";
import type {
  ProductOrderItem,
  ReformOrderItem,
} from "@/features/order/types/view/order";
import type { CartItem } from "@/features/cart/types/view/cart";

// ── Product ──

export const createProductOption = (
  overrides?: Partial<ProductOption>,
): ProductOption => ({
  id: "opt-1",
  name: "기본",
  additionalPrice: 0,
  ...overrides,
});

export const createProduct = (overrides?: Partial<Product>): Product => ({
  id: 1,
  code: "P001",
  name: "테스트 넥타이",
  price: 10000,
  image: "image.jpg",
  category: "3fold",
  color: "black",
  pattern: "solid",
  material: "silk",
  likes: 0,
  info: "테스트 상품",
  options: [createProductOption()],
  ...overrides,
});

// ── Coupon ──

export const createCoupon = (overrides?: Partial<Coupon>): Coupon => ({
  id: "c-1",
  name: "500원 할인",
  discountType: "fixed",
  discountValue: 500,
  expiryDate: "2027-01-01",
  ...overrides,
});

export const createAppliedCoupon = (
  overrides?: Partial<AppliedCoupon>,
): AppliedCoupon => ({
  id: "uc-1",
  userId: "u-1",
  couponId: "c-1",
  status: "active",
  issuedAt: "2026-01-01",
  coupon: createCoupon(overrides?.coupon),
  ...overrides,
});

// ── OrderItem ──

export const createProductOrderItem = (
  overrides?: Partial<ProductOrderItem>,
): ProductOrderItem => {
  const product = overrides?.product ?? createProduct();
  return {
    id: "item-1",
    type: "product",
    product,
    selectedOption: product.options?.[0],
    quantity: 1,
    ...overrides,
  };
};

export const createReformOrderItem = (
  overrides?: Partial<ReformOrderItem>,
): ReformOrderItem => ({
  id: "reform-1",
  type: "reform",
  quantity: 1,
  reformData: {
    tie: { id: "tie-1", measurementType: "length", tieLength: 145 },
    cost: 15000,
  },
  ...overrides,
});

// ── CartItem ──

export const createCartItem = (overrides?: Partial<CartItem>): CartItem => ({
  ...createProductOrderItem(),
  ...overrides,
});

export const createReformCartItem = (
  overrides?: Partial<CartItem>,
): CartItem => ({
  ...createReformOrderItem(),
  ...overrides,
});
