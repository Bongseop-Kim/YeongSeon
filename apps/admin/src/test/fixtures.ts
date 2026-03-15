import type {
  AdminClaimListRowDTO,
  ClaimStatusLogDTO,
  AdminInquiryRowDTO,
  AdminCustomOrderItemRowDTO,
  AdminOrderDetailRowDTO,
  AdminOrderListRowDTO,
  AdminProductOrderItemRowDTO,
  AdminQuoteRequestDetailRowDTO,
  AdminQuoteRequestListRowDTO,
  AdminReformOrderItemRowDTO,
  AdminTokenOrderItemRowDTO,
  OrderStatusLogDTO,
  QuoteRequestStatusLogDTO,
} from "@yeongseon/shared";
import type {
  DesignTokenRow,
  ProfileRow,
  UserCouponRow,
} from "@/features/customers/api/customers-mapper";
import type { ImageRef } from "@yeongseon/shared";

export const createAdminOrderItemRowDTO = (
  overrides?: Partial<AdminProductOrderItemRowDTO>,
): AdminProductOrderItemRowDTO => ({
  id: "row-1",
  orderId: "order-1",
  itemId: "item-1",
  itemType: "product",
  productId: 1,
  selectedOptionId: "opt-1",
  reformData: null,
  quantity: 1,
  unitPrice: 10000,
  discountAmount: 1000,
  lineDiscountAmount: 1000,
  appliedUserCouponId: "coupon-1",
  created_at: "2026-03-15T09:00:00Z",
  productName: "테스트 넥타이",
  productCode: "P001",
  productImage: "image.jpg",
  ...overrides,
});

export const createAdminCustomOrderItemRowDTO = (
  overrides?: Partial<AdminCustomOrderItemRowDTO>,
): AdminCustomOrderItemRowDTO => ({
  id: "row-1",
  orderId: "order-1",
  itemId: "item-1",
  itemType: "custom",
  productId: null,
  selectedOptionId: null,
  reformData: {
    quantity: 1,
    pricing: {
      sewing_cost: 12000,
      fabric_cost: 8000,
      sample_cost: 0,
      total_cost: 20000,
    },
  },
  quantity: 1,
  unitPrice: 10000,
  discountAmount: 1000,
  lineDiscountAmount: 1000,
  appliedUserCouponId: "coupon-1",
  created_at: "2026-03-15T09:00:00Z",
  productName: null,
  productCode: null,
  productImage: null,
  ...overrides,
});

export const createAdminReformOrderItemRowDTO = (
  overrides?: Partial<AdminReformOrderItemRowDTO>,
): AdminReformOrderItemRowDTO => ({
  id: "row-1",
  orderId: "order-1",
  itemId: "item-1",
  itemType: "reform",
  productId: null,
  selectedOptionId: null,
  reformData: {
    tie: {
      image: "image.jpg",
      tieLength: 145,
    },
  },
  quantity: 1,
  unitPrice: 10000,
  discountAmount: 1000,
  lineDiscountAmount: 1000,
  appliedUserCouponId: "coupon-1",
  created_at: "2026-03-15T09:00:00Z",
  productName: null,
  productCode: null,
  productImage: null,
  ...overrides,
});

export const createAdminTokenOrderItemRowDTO = (
  overrides?: Partial<AdminTokenOrderItemRowDTO>,
): AdminTokenOrderItemRowDTO => ({
  id: "row-1",
  orderId: "order-1",
  itemId: "item-1",
  itemType: "token",
  productId: null,
  selectedOptionId: null,
  reformData: {
    plan_key: "starter",
    token_amount: 30,
  },
  quantity: 1,
  unitPrice: 10000,
  discountAmount: 1000,
  lineDiscountAmount: 1000,
  appliedUserCouponId: "coupon-1",
  created_at: "2026-03-15T09:00:00Z",
  productName: null,
  productCode: null,
  productImage: null,
  ...overrides,
});

export const createAdminOrderListRowDTO = (
  overrides?: Partial<AdminOrderListRowDTO>,
): AdminOrderListRowDTO => ({
  id: "order-1",
  userId: "user-1",
  orderNumber: "ORD-001",
  date: "2026-03-15",
  orderType: "custom",
  status: "진행중",
  totalPrice: 23000,
  originalPrice: 25000,
  totalDiscount: 2000,
  courierCompany: "CJ대한통운",
  trackingNumber: "1234567890",
  shippedAt: "2026-03-15T10:00:00Z",
  deliveredAt: null,
  confirmedAt: null,
  created_at: "2026-03-15T09:00:00Z",
  updated_at: "2026-03-15T09:30:00Z",
  customerName: "홍길동",
  customerPhone: "010-1111-2222",
  customerEmail: "hong@example.com",
  fabricType: "silk",
  designType: "classic",
  itemQuantity: 1,
  reformSummary: null,
  paymentGroupId: "pg-1",
  shippingCost: 3000,
  isSample: false,
  sampleType: null,
  ...overrides,
});

export const createAdminOrderDetailRowDTO = (
  overrides?: Partial<AdminOrderDetailRowDTO>,
): AdminOrderDetailRowDTO => {
  const {
    fabricType: _fabricType,
    designType: _designType,
    itemQuantity: _itemQuantity,
    reformSummary: _reformSummary,
    isSample: _isSample,
    sampleType: _sampleType,
    ...sharedFields
  } = createAdminOrderListRowDTO();

  return {
    ...sharedFields,
    sampleCost: 5000,
    recipientName: "홍길동",
    recipientPhone: "010-3333-4444",
    shippingAddress: "서울특별시 강남구 테헤란로 1",
    shippingAddressDetail: "101호",
    shippingPostalCode: "06236",
    deliveryMemo: "문 앞에 놓아주세요",
    deliveryRequest: "부재 시 연락 바랍니다",
    ...overrides,
  };
};

export const createOrderStatusLogDTO = (
  overrides?: Partial<OrderStatusLogDTO>,
): OrderStatusLogDTO => ({
  id: "status-log-1",
  orderId: "order-1",
  changedBy: "admin-1",
  previousStatus: "대기중",
  newStatus: "진행중",
  memo: "처리 시작",
  isRollback: false,
  createdAt: "2026-03-15T11:00:00Z",
  ...overrides,
});

export const createAdminClaimListRowDTO = (
  overrides?: Partial<AdminClaimListRowDTO>,
): AdminClaimListRowDTO => ({
  id: "claim-1",
  userId: "user-1",
  claimNumber: "CLM-001",
  date: "2026-03-15",
  status: "접수",
  type: "return",
  reason: "불량",
  description: "오염",
  claimQuantity: 1,
  created_at: "2026-03-15T09:00:00Z",
  updated_at: "2026-03-15T09:30:00Z",
  returnCourierCompany: "CJ대한통운",
  returnTrackingNumber: "RT-123",
  resendCourierCompany: "한진택배",
  resendTrackingNumber: "RS-456",
  orderId: "order-1",
  orderNumber: "ORD-001",
  orderStatus: "배송중",
  orderCourierCompany: "CJ대한통운",
  orderTrackingNumber: "OD-789",
  orderShippedAt: "2026-03-14T09:00:00Z",
  customerName: "홍길동",
  customerPhone: "010-1111-2222",
  itemType: "product",
  productName: "테스트 넥타이",
  refund_data: {
    paid_token_amount: 10,
    bonus_token_amount: 5,
    refund_amount: 15000,
  },
  ...overrides,
});

export const createClaimStatusLogDTO = (
  overrides?: Partial<ClaimStatusLogDTO>,
): ClaimStatusLogDTO => ({
  id: "claim-status-log-1",
  claimId: "claim-1",
  changedBy: "admin-1",
  previousStatus: "접수",
  newStatus: "처리중",
  memo: "확인 완료",
  isRollback: false,
  createdAt: "2026-03-15T11:30:00Z",
  ...overrides,
});

export const createProfileRow = (
  overrides?: Partial<ProfileRow>,
): ProfileRow => ({
  id: "user-1",
  name: "홍길동",
  phone: "010-1111-2222",
  role: "customer",
  is_active: true,
  created_at: "2026-03-15T09:00:00Z",
  birth: "1990-01-01",
  ...overrides,
});

export const createUserCouponRow = (
  overrides?: Partial<UserCouponRow>,
): UserCouponRow => ({
  id: "uc-1",
  coupon_id: "coupon-1",
  status: "active",
  issued_at: "2026-03-01T09:00:00Z",
  expires_at: "2026-03-31T23:59:59Z",
  ...overrides,
});

export const createDesignTokenRow = (
  overrides?: Partial<DesignTokenRow>,
): DesignTokenRow => ({
  id: "token-1",
  user_id: "user-1",
  amount: 30,
  type: "purchase",
  ai_model: "gpt-image-1",
  request_type: "design",
  description: "토큰 구매",
  created_at: "2026-03-15T09:00:00Z",
  work_id: "work-1",
  ...overrides,
});

export interface ProductsTableRowFixture {
  id: number;
  image: string;
  code: string | null;
  name: string;
  category: string;
  color: string;
  pattern: string;
  material: string;
  info: string;
  price: number;
  stock: number | null;
}

export const createProductsTableRow = (
  overrides?: Partial<ProductsTableRowFixture>,
): ProductsTableRowFixture => ({
  id: 1,
  image: "https://example.com/tie.jpg",
  code: "P001",
  name: "테스트 넥타이",
  category: "3fold",
  color: "navy",
  pattern: "solid",
  material: "silk",
  info: "테스트 상품 설명",
  price: 39000,
  stock: 12,
  ...overrides,
});

export interface ProductOptionRowFixture {
  id: string;
  name: string;
  additional_price: number;
  stock: number | null;
  product_id: number;
  created_at: string;
}

export const createProductOptionRow = (
  overrides?: Partial<ProductOptionRowFixture>,
): ProductOptionRowFixture => ({
  id: "00000000-0000-0000-0000-000000000001",
  name: "기본 옵션",
  additional_price: 5000,
  stock: 3,
  product_id: 1,
  created_at: "2026-03-15T09:00:00Z",
  ...overrides,
});

export interface IssuedCouponViewRowFixture {
  id: string | null | undefined;
  userId: string | null;
  couponId: string | null;
  userName: string | null;
  userEmail: string | null;
  status: string | null;
  issuedAt: string | null;
}

export const createIssuedCouponViewRow = (
  overrides?: Partial<IssuedCouponViewRowFixture>,
): IssuedCouponViewRowFixture => ({
  id: "issued-1",
  userId: "user-1",
  couponId: "coupon-1",
  userName: "홍길동",
  userEmail: "hong@example.com",
  status: "active",
  issuedAt: "2026-03-15T09:00:00Z",
  ...overrides,
});

export const createAdminQuoteRequestListRowDTO = (
  overrides?: Partial<AdminQuoteRequestListRowDTO>,
): AdminQuoteRequestListRowDTO => ({
  id: "quote-1",
  userId: "user-1",
  quoteNumber: "Q-20260315-001",
  date: "2026-03-15",
  status: "견적대기",
  quantity: 100,
  quotedAmount: 250000,
  contactName: "김담당",
  contactTitle: "팀장",
  contactMethod: "email",
  contactValue: "manager@example.com",
  createdAt: "2026-03-15T09:00:00Z",
  updatedAt: "2026-03-15T10:00:00Z",
  customerName: "홍길동",
  customerPhone: "010-1111-2222",
  customerEmail: "hong@example.com",
  ...overrides,
});

export const createAdminQuoteRequestDetailRowDTO = (
  overrides?: Partial<AdminQuoteRequestDetailRowDTO>,
): AdminQuoteRequestDetailRowDTO => ({
  id: "quote-1",
  userId: "user-1",
  quoteNumber: "Q-20260315-001",
  date: "2026-03-15",
  status: "견적대기",
  options: {
    tie_type: "3fold",
    interlining: "wool",
    design_type: "classic",
    fabric_type: "silk",
    fabric_provided: true,
    interlining_thickness: "thick",
    triangle_stitch: true,
    side_stitch: false,
    bar_tack: true,
    dimple: true,
    spoderato: false,
    fold7: true,
    brand_label: true,
    care_label: false,
  },
  quantity: 100,
  referenceImages: [
    {
      url: "https://example.com/ref-1.jpg",
      fileId: "file-1",
    } satisfies ImageRef,
  ],
  additionalNotes: "안감 포함",
  contactName: "김담당",
  contactTitle: "팀장",
  contactMethod: "email",
  contactValue: "manager@example.com",
  quotedAmount: 250000,
  quoteConditions: "부가세 별도",
  adminMemo: "VIP 고객",
  createdAt: "2026-03-15T09:00:00Z",
  updatedAt: "2026-03-15T10:00:00Z",
  customerName: "홍길동",
  customerPhone: "010-1111-2222",
  customerEmail: "hong@example.com",
  recipientName: "김수령",
  recipientPhone: "010-3333-4444",
  shippingAddress: "서울시 강남구",
  shippingAddressDetail: "101동 202호",
  shippingPostalCode: "12345",
  deliveryMemo: "문 앞 배송",
  deliveryRequest: "평일 오전",
  ...overrides,
});

export const createQuoteRequestStatusLogDTO = (
  overrides?: Partial<QuoteRequestStatusLogDTO>,
): QuoteRequestStatusLogDTO => ({
  id: "log-1",
  quoteRequestId: "quote-1",
  changedBy: "admin-1",
  previousStatus: "견적대기",
  newStatus: "견적완료",
  memo: "금액 확정",
  createdAt: "2026-03-15T11:00:00Z",
  ...overrides,
});

export const createAdminInquiryRowDTO = (
  overrides?: Partial<AdminInquiryRowDTO>,
): AdminInquiryRowDTO => ({
  id: "inquiry-1",
  user_id: "user-1",
  title: "배송 문의",
  content: "언제 배송되나요?",
  status: "답변대기",
  category: "상품",
  product_id: 1,
  products: {
    id: 1,
    name: "테스트 넥타이",
    image: "https://example.com/product.jpg",
  },
  answer: null,
  answer_date: null,
  created_at: "2026-03-15T09:00:00Z",
  ...overrides,
});
