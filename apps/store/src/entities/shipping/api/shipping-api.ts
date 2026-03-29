import { supabase } from "@/shared/lib/supabase";
import { requireUserId } from "@/shared/lib/require-user-id";
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

const mapUpsertedAddress = (record: ShippingAddressRecord | null) => {
  if (!record) {
    throw new Error("배송지 저장 결과를 받을 수 없습니다.");
  }

  return toShippingAddressView(record);
};

/**
 * 현재 사용자의 모든 배송지 조회
 */
export const getShippingAddresses = async (): Promise<ShippingAddress[]> => {
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("*")
    .eq("user_id", userId)
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
 * 배송지 삭제
 *
 * 직접 테이블 쓰기 예외: shipping_addresses DELETE
 * 근거: supabase/schemas/11_shipping_addresses.sql RLS 정책
 *   "user_id = auth.uid()" 로 소유권이 보장되며, 단일 원자 연산이므로 직접 삭제 허용.
 */
export const deleteShippingAddress = async (id: string): Promise<void> => {
  const userId = await requireUserId();

  const { error } = await supabase
    .from(TABLE_NAME)
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    throw new Error(`배송지 삭제 실패: ${error.message}`);
  }
};

/**
 * 기본 배송지 조회
 */
export const getDefaultShippingAddress =
  async (): Promise<ShippingAddress | null> => {
    const userId = await requireUserId();

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select("*")
      .eq("user_id", userId)
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
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
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

  return mapUpsertedAddress(record as ShippingAddressRecord | null);
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

  return mapUpsertedAddress(record as ShippingAddressRecord | null);
};
