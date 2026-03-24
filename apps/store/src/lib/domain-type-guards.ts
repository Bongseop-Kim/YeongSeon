import type { UserCouponStatusDTO } from "@yeongseon/shared/types/dto/coupon";
import type {
  ProductCategoryDTO,
  ProductColorDTO,
  ProductMaterialDTO,
  ProductPatternDTO,
} from "@yeongseon/shared/types/dto/product";

const PRODUCT_CATEGORIES: ReadonlySet<string> = new Set([
  "3fold",
  "sfolderato",
  "knit",
  "bowtie",
]);
export const isProductCategory = (v: string): v is ProductCategoryDTO =>
  PRODUCT_CATEGORIES.has(v);

const PRODUCT_COLORS: ReadonlySet<string> = new Set([
  "black",
  "navy",
  "gray",
  "wine",
  "blue",
  "brown",
  "beige",
  "silver",
]);
export const isProductColor = (v: string): v is ProductColorDTO =>
  PRODUCT_COLORS.has(v);

const PRODUCT_PATTERNS: ReadonlySet<string> = new Set([
  "solid",
  "stripe",
  "dot",
  "check",
  "paisley",
]);
export const isProductPattern = (v: string): v is ProductPatternDTO =>
  PRODUCT_PATTERNS.has(v);

const PRODUCT_MATERIALS: ReadonlySet<string> = new Set([
  "silk",
  "cotton",
  "polyester",
  "wool",
]);
export const isProductMaterial = (v: string): v is ProductMaterialDTO =>
  PRODUCT_MATERIALS.has(v);

const TIE_MEASUREMENT_TYPES: ReadonlySet<string> = new Set([
  "length",
  "height",
]);
export const isTieMeasurementType = (v: string): v is "length" | "height" =>
  TIE_MEASUREMENT_TYPES.has(v);

const DISCOUNT_TYPES: ReadonlySet<string> = new Set(["percentage", "fixed"]);
export const isDiscountType = (v: string): v is "percentage" | "fixed" =>
  DISCOUNT_TYPES.has(v);

const USER_COUPON_STATUSES: ReadonlySet<string> = new Set([
  "active",
  "used",
  "expired",
  "revoked",
]);
export const isUserCouponStatus = (v: string): v is UserCouponStatusDTO =>
  USER_COUPON_STATUSES.has(v);
