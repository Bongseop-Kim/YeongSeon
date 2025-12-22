import { supabase } from "@/lib/supabase";
import type { Product, ProductOption } from "../types/product";
import type {
  ProductRecord,
  ProductOptionRecord,
} from "../types/product-record";
import { checkLikedProducts, getLikeCounts } from "./likes.api";

const TABLE_NAME = "products";
const OPTIONS_TABLE_NAME = "product_options";

/**
 * 모든 제품 조회
 */
export const getProducts = async (): Promise<Product[]> => {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("*")
    .order("id", { ascending: true });

  if (error) {
    throw new Error(`제품 조회 실패: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return [];
  }

  // 제품 옵션 조회
  const productIds = data.map((p) => p.id);
  const { data: optionsData, error: optionsError } = await supabase
    .from(OPTIONS_TABLE_NAME)
    .select("*")
    .in("product_id", productIds);

  if (optionsError) {
    console.warn("제품 옵션 조회 실패:", optionsError.message);
  }

  // 옵션을 제품별로 그룹화
  const optionsByProductId = new Map<number, ProductOption[]>();
  if (optionsData) {
    optionsData.forEach((opt: ProductOptionRecord) => {
      const option: ProductOption = {
        id: opt.option_id,
        name: opt.name,
        additionalPrice: opt.additional_price,
      };
      if (!optionsByProductId.has(opt.product_id)) {
        optionsByProductId.set(opt.product_id, []);
      }
      optionsByProductId.get(opt.product_id)!.push(option);
    });
  }

  // 사용자가 좋아요한 제품 ID 조회
  let likedProductIds = new Set<number>();
  try {
    likedProductIds = await checkLikedProducts(productIds);
  } catch (error) {
    // 로그인하지 않은 경우 무시
    console.warn("좋아요 상태 조회 실패:", error);
  }

  // 모든 제품의 좋아요 수 조회
  let likeCounts = new Map<number, number>();
  try {
    likeCounts = await getLikeCounts(productIds);
  } catch (error) {
    console.warn("좋아요 수 조회 실패:", error);
  }

  // 레코드를 Product 타입으로 변환
  return data.map((record: ProductRecord) => {
    const product: Product = {
      id: record.id,
      code: record.code,
      name: record.name,
      price: record.price,
      image: record.image,
      category: record.category,
      color: record.color,
      pattern: record.pattern,
      material: record.material,
      likes: likeCounts.get(record.id) || 0,
      info: record.info,
      isLiked: likedProductIds.has(record.id),
    };

    const options = optionsByProductId.get(record.id);
    if (options && options.length > 0) {
      product.options = options;
    }

    return product;
  });
};

/**
 * ID로 제품 조회
 */
export const getProductById = async (id: number): Promise<Product | null> => {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // 데이터가 없음
      return null;
    }
    throw new Error(`제품 조회 실패: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  // 제품 옵션 조회
  const { data: optionsData } = await supabase
    .from(OPTIONS_TABLE_NAME)
    .select("*")
    .eq("product_id", id)
    .order("option_id", { ascending: true });

  // 사용자가 좋아요한 제품인지 확인
  let isLiked = false;
  try {
    const likedProductIds = await checkLikedProducts([id]);
    isLiked = likedProductIds.has(id);
  } catch (error) {
    // 로그인하지 않은 경우 무시
    console.warn("좋아요 상태 조회 실패:", error);
  }

  // 좋아요 수 조회
  let likeCount = 0;
  try {
    const likeCounts = await getLikeCounts([id]);
    likeCount = likeCounts.get(id) || 0;
  } catch (error) {
    console.warn("좋아요 수 조회 실패:", error);
  }

  // 레코드를 Product 타입으로 변환
  const product: Product = {
    id: data.id,
    code: data.code,
    name: data.name,
    price: data.price,
    image: data.image,
    category: data.category,
    color: data.color,
    pattern: data.pattern,
    material: data.material,
    likes: likeCount,
    info: data.info,
    isLiked,
  };

  // 옵션이 있으면 추가
  if (optionsData && optionsData.length > 0) {
    product.options = optionsData.map((opt: ProductOptionRecord) => ({
      id: opt.option_id,
      name: opt.name,
      additionalPrice: opt.additional_price,
    }));
  }

  return product;
};
