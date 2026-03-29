import { supabase } from "@/shared/lib/supabase";
import type {
  ShippingAddress,
  ShippingAddressInput,
} from "@/entities/shipping/model/shipping-address";
import type { ShippingAddressRecord } from "@/entities/shipping/model/shipping-address-record";
import {
  toShippingAddressView,
  toUpsertShippingAddressParams,
} from "@/entities/shipping/api/shipping-mapper";

const TABLE_NAME = "shipping_addresses";

/**
 * 현재 사용자의 모든 배송지 조회
 */
export const getShippingAddresses = async (): Promise<ShippingAddress[]> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("로그인이 필요합니다.");
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("*")
    .eq("user_id", user.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`배송지 조회 실패: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return [];
  }

  return data.map(toShippingAddressView);
};

/**
 * 기본 배송지 조회
 */
export const getDefaultShippingAddress =
  async (): Promise<ShippingAddress | null> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("로그인이 필요합니다.");
    }

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select("*")
      .eq("user_id", user.id)
      .eq("is_default", true)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // 기본 배송지가 없는 경우
        return null;
      }
      throw new Error(`기본 배송지 조회 실패: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return toShippingAddressView(data);
  };

/**
 * ID로 배송지 조회
 */
export const getShippingAddressById = async (
  id: string,
): Promise<ShippingAddress | null> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("로그인이 필요합니다.");
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw new Error(`배송지 조회 실패: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return toShippingAddressView(data);
};

/**
 * 배송지 생성 (RPC: is_default 토글 원자적 처리)
 */
export const createShippingAddress = async (
  data: ShippingAddressInput,
): Promise<ShippingAddress> => {
  const { data: record, error } = await supabase
    .rpc("upsert_shipping_address", toUpsertShippingAddressParams(null, data))
    .single();

  if (error) {
    throw new Error(`배송지 생성 실패: ${error.message}`);
  }

  return toShippingAddressView(record as ShippingAddressRecord);
};

/**
 * 배송지 업데이트 (RPC: is_default 토글 원자적 처리)
 */
export const updateShippingAddress = async (
  id: string,
  data: ShippingAddressInput,
): Promise<ShippingAddress> => {
  const { data: record, error } = await supabase
    .rpc("upsert_shipping_address", toUpsertShippingAddressParams(id, data))
    .single();

  if (error) {
    throw new Error(`배송지 업데이트 실패: ${error.message}`);
  }

  return toShippingAddressView(record as ShippingAddressRecord);
};
