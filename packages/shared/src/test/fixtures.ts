import type {
  Product,
  ProductOption,
} from "@yeongseon/shared/types/view/product";
import type {
  AppliedCoupon,
  Coupon,
} from "@yeongseon/shared/types/view/coupon";
import type {
  ProductOrderItem,
  ReformOrderItem,
  CustomOrderItem,
  SampleOrderItem,
  TokenOrderItem,
} from "@yeongseon/shared/types/view/order";
import type {
  ProductCartItem,
  ReformCartItem,
} from "@yeongseon/shared/types/view/cart";
import type {
  CustomOrderDataDTO,
  OrderItemDTO,
  SampleOrderItemDTO,
} from "@yeongseon/shared/types/dto/order-view";
import type { NullableItemRow } from "@yeongseon/shared/mappers/shared-mapper";

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

export const createCartItem = (
  overrides?: Partial<ProductCartItem>,
): ProductCartItem => ({
  ...createProductOrderItem(),
  ...overrides,
});

export const createReformCartItem = (
  overrides?: Partial<ReformCartItem>,
): ReformCartItem => ({
  ...createReformOrderItem(),
  ...overrides,
});

// ── Shared mapper fixtures ────────────────────────────────────

export const createCustomOrderData = (
  overrides?: Partial<CustomOrderDataDTO>,
): CustomOrderDataDTO => ({
  options: {
    tieType: "3fold",
    interlining: "wool",
    designType: "classic",
    fabricType: "silk",
    fabricProvided: false,
    triangleStitch: true,
    sideStitch: false,
    barTack: true,
    dimple: true,
    spoderato: false,
    fold7: false,
    brandLabel: true,
    careLabel: true,
  },
  pricing: {
    sewingCost: 12000,
    fabricCost: 8000,
    sampleCost: 0,
    totalCost: 20000,
  },
  sample: false,
  sampleType: null,
  referenceImageUrls: ["https://example.com/reference-1.jpg"],
  additionalNotes: "샘플 메모",
  ...overrides,
});

export const createNullableItemRow = (
  overrides?: Partial<NullableItemRow>,
): NullableItemRow => ({
  id: "item-1",
  type: "product",
  product: createProduct(),
  selectedOption: createProductOption(),
  quantity: 1,
  reformData: null,
  customData: null,
  appliedCoupon: null,
  ...overrides,
});

type ProductOrderItemDTOOverrides = Partial<
  Omit<Extract<OrderItemDTO, { type: "product" }>, "type">
>;
type CustomOrderItemDTOOverrides = Partial<
  Omit<Extract<OrderItemDTO, { type: "custom" }>, "type">
>;
type TokenOrderItemDTOOverrides = Partial<
  Omit<Extract<OrderItemDTO, { type: "token" }>, "type">
>;
type ReformOrderItemDTOOverrides = Partial<
  Omit<Extract<OrderItemDTO, { type: "reform" }>, "type">
>;

// ── Custom / Sample / Token OrderItem (View) ─────────────────────────────

export const createCustomOrderItem = (
  overrides?: Partial<CustomOrderItem>,
): CustomOrderItem => ({
  id: "custom-1",
  type: "custom",
  quantity: 1,
  customData: {
    options: {
      tieType: "3fold",
      interlining: "wool",
      designType: "classic",
      fabricType: "silk",
      fabricProvided: false,
      triangleStitch: true,
      sideStitch: false,
      barTack: true,
      dimple: true,
      spoderato: false,
      fold7: false,
      brandLabel: true,
      careLabel: true,
    },
    pricing: {
      sewingCost: 12000,
      fabricCost: 8000,
      sampleCost: 0,
      totalCost: 20000,
    },
    sample: false,
    sampleType: null,
    referenceImageUrls: [],
    additionalNotes: null,
  },
  ...overrides,
});

export const createSampleOrderItem = (
  overrides?: Partial<SampleOrderItem>,
): SampleOrderItem => ({
  id: "sample-1",
  type: "sample",
  quantity: 1,
  sampleData: {
    sampleType: "fabric",
    options: {
      fabricType: "silk",
      designType: null,
      tieType: null,
      interlining: null,
    },
    pricing: {
      totalCost: 5000,
    },
    referenceImageUrls: [],
    additionalNotes: null,
  },
  ...overrides,
});

export const createTokenOrderItem = (
  overrides?: Partial<TokenOrderItem>,
): TokenOrderItem => ({
  id: "token-1",
  type: "token",
  quantity: 1,
  ...overrides,
});

// ── SampleOrderItemDTO ────────────────────────────────────────────────────

export const createSampleOrderItemDTO = (
  overrides?: Partial<SampleOrderItemDTO>,
): SampleOrderItemDTO => ({
  id: "sample-1",
  type: "sample",
  quantity: 1,
  sampleData: {
    sampleType: "fabric",
    options: {
      fabricType: "silk",
      designType: null,
      tieType: null,
      interlining: null,
    },
    pricing: {
      totalCost: 5000,
    },
    referenceImageUrls: [],
    additionalNotes: null,
  },
  ...overrides,
});

type CreateOrderItemDTOOptions =
  | {
      type?: "product";
      overrides?: ProductOrderItemDTOOverrides;
    }
  | {
      type: "custom";
      overrides?: CustomOrderItemDTOOverrides;
    }
  | {
      type: "token";
      overrides?: TokenOrderItemDTOOverrides;
    }
  | {
      type: "reform";
      overrides?: ReformOrderItemDTOOverrides;
    };

export const createOrderItemDTO = (
  options: CreateOrderItemDTOOptions = {},
): OrderItemDTO => {
  const { type = "product", overrides } = options;

  if (type === "custom") {
    return {
      id: "item-1",
      type: "custom",
      quantity: 1,
      customData: createCustomOrderData(),
      ...((overrides ?? {}) as CustomOrderItemDTOOverrides),
    };
  }

  if (type === "token") {
    return {
      id: "item-1",
      type: "token",
      quantity: 1,
      ...((overrides ?? {}) as TokenOrderItemDTOOverrides),
    };
  }

  if (type === "reform") {
    return {
      id: "item-1",
      type: "reform",
      quantity: 1,
      reformData: {
        tie: { id: "tie-1", measurementType: "length", tieLength: 145 },
        cost: 15000,
      },
      ...((overrides ?? {}) as ReformOrderItemDTOOverrides),
    };
  }

  return {
    id: "item-1",
    type: "product",
    product: createProduct(),
    selectedOption: createProductOption(),
    quantity: 1,
    ...((overrides ?? {}) as ProductOrderItemDTOOverrides),
  };
};
