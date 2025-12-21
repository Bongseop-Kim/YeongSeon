import type { CartItem, ProductCartItem, ReformCartItem } from "@/types/cart";
import type { Product } from "@/features/shop/types/product";
import type { Coupon } from "@/types/coupon";
import type { TieItem } from "@/features/reform/types/reform";

/**
 * DB 레코드 타입
 * TieItem의 image는 File이므로 DB에는 URL 문자열로 저장
 */
export interface CartItemRecord {
  id: string;
  user_id: string;
  item_id: string;
  item_type: "product" | "reform";
  product_id: number | null;
  selected_option_id: string | null;
  reform_data: {
    tie: {
      id: string;
      image?: string; // DB에는 URL 문자열로 저장 (File은 스토리지에 저장)
      measurementType?: "length" | "height";
      tieLength?: number;
      wearerHeight?: number;
      notes?: string;
      checked?: boolean;
    };
    cost: number;
  } | null;
  quantity: number;
  applied_coupon_id: string | null;
  created_at: string;
  updated_at: string;
}

// TODO:: 슈퍼베이스에 상품과 큐폰 테이블이 없어서 클라이언트 상수에서 가져오기 위해 만들어진 쓸데 없는 MAPPER 함수
// TODO:: 이거 없애고 서버에서 상품과 큐폰 정보를 조인해서 가져오도록 수정
/**
 * DB 레코드를 CartItem으로 변환
 * Product와 Coupon 정보는 클라이언트 상수에서 가져옴
 */
export function mapRecordToCartItem(
  record: CartItemRecord,
  productResolver: (productId: number) => Product | undefined,
  couponResolver?: (couponId: string) => Coupon | undefined
): CartItem {
  if (record.item_type === "product") {
    if (!record.product_id) {
      throw new Error("Product ID is required for product cart items");
    }

    const product = productResolver(record.product_id);
    if (!product) {
      throw new Error(`Product not found: ${record.product_id}`);
    }

    const selectedOption = record.selected_option_id
      ? product.options?.find((opt) => opt.id === record.selected_option_id)
      : undefined;

    const appliedCoupon: Coupon | undefined = record.applied_coupon_id
      ? couponResolver?.(record.applied_coupon_id) || undefined
      : undefined;

    const cartItem: ProductCartItem = {
      id: record.item_id,
      type: "product",
      product,
      selectedOption,
      quantity: record.quantity,
      appliedCoupon,
    };

    return cartItem;
  } else {
    // reform 타입
    if (!record.reform_data) {
      throw new Error("Reform data is required for reform cart items");
    }

    const appliedCoupon: Coupon | undefined = record.applied_coupon_id
      ? couponResolver?.(record.applied_coupon_id) || undefined
      : undefined;

    // DB의 tie.image는 string (URL)로 저장됨
    const tie: TieItem = {
      id: record.reform_data.tie.id,
      image: record.reform_data.tie.image, // URL 문자열로 복원
      measurementType: record.reform_data.tie.measurementType,
      tieLength: record.reform_data.tie.tieLength,
      wearerHeight: record.reform_data.tie.wearerHeight,
      notes: record.reform_data.tie.notes,
      checked: record.reform_data.tie.checked,
    };

    const cartItem: ReformCartItem = {
      id: record.item_id,
      type: "reform",
      quantity: record.quantity,
      reformData: {
        tie,
        cost: record.reform_data.cost,
      },
      appliedCoupon,
    };

    return cartItem;
  }
}

/**
 * CartItem을 DB 레코드로 변환
 */
export function mapCartItemToRecord(
  item: CartItem,
  userId: string
): Omit<CartItemRecord, "id" | "created_at" | "updated_at"> {
  if (item.type === "product") {
    return {
      user_id: userId,
      item_id: item.id,
      item_type: "product",
      product_id: item.product.id,
      selected_option_id: item.selectedOption?.id || null,
      reform_data: null,
      quantity: item.quantity,
      applied_coupon_id: item.appliedCoupon?.id || null,
    };
  } else {
    // reform 타입
    return {
      user_id: userId,
      item_id: item.id,
      item_type: "reform",
      product_id: null,
      selected_option_id: null,
      reform_data: {
        tie: {
          id: item.reformData.tie.id,
          // File은 DB에 저장 불가 - URL로 변환 필요
          // string인 경우(이미 URL) 그대로 저장, File인 경우 undefined (스토리지 업로드 후 URL 저장 필요)
          image: item.reformData.tie.image
            ? typeof item.reformData.tie.image === "string"
              ? item.reformData.tie.image
              : undefined // File은 스토리지에 업로드 후 URL로 저장해야 함
            : undefined,
          measurementType: item.reformData.tie.measurementType,
          tieLength: item.reformData.tie.tieLength,
          wearerHeight: item.reformData.tie.wearerHeight,
          notes: item.reformData.tie.notes,
          checked: item.reformData.tie.checked,
        },
        cost: item.reformData.cost,
      } as NonNullable<CartItemRecord["reform_data"]>,
      quantity: item.quantity,
      applied_coupon_id: item.appliedCoupon?.id || null,
    };
  }
}
