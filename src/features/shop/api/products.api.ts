import { supabase } from "@/lib/supabase";
import type { Product, ProductOption } from "../types/product";
import type {
  ProductRecord,
  ProductOptionRecord,
} from "../types/product-record";

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
      likes: record.likes,
      info: record.info,
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
    likes: data.likes,
    info: data.info,
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
