export {
  createProductOption,
  createProduct,
  createCoupon,
  createAppliedCoupon,
  createCartItem,
  createReformCartItem,
} from "@yeongseon/shared/test/fixtures";
export const createOrderItemRowRaw = (
  overrides?: Partial<Record<string, unknown>>,
): Record<string, unknown> => ({
  id: "item-1",
  order_id: "order-1",
  type: "product",
  product: {
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
  },
  selectedOption: {
    id: "opt-1",
    name: "기본",
    additionalPrice: 0,
  },
  quantity: 1,
  reformData: null,
  appliedCoupon: null,
  created_at: "2026-03-15T09:00:00Z",
  ...overrides,
});

export const createClaimListRowRaw = (
  overrides?: Partial<Record<string, unknown>>,
): Record<string, unknown> => ({
  id: "claim-1",
  claimNumber: "CLM-001",
  date: "2026-03-15",
  status: "접수",
  type: "cancel",
  reason: "단순 변심",
  description: "사이즈 변경",
  claimQuantity: 1,
  orderId: "order-1",
  orderNumber: "ORD-001",
  orderDate: "2026-03-14",
  item: createOrderItemRowRaw(),
  refund_data: null,
  ...overrides,
});

export const createConfirmPaymentResponseRaw = (
  overrides?: Partial<Record<string, unknown>>,
): Record<string, unknown> => ({
  paymentKey: "pay-key",
  paymentGroupId: "pg-1",
  orders: [{ orderId: "order-1", orderType: "sale" }],
  status: "DONE",
  ...overrides,
});
