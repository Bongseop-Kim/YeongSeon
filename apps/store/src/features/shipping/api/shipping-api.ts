import { supabase } from "@/lib/supabase";
import type { ShippingAddress } from "@/features/shipping/types/shipping-address";
import type {
  CreateShippingAddressData,
  UpdateShippingAddressData,
} from "@/features/shipping/types/shipping-address-record";
import {
  toShippingAddressView,
  toCreateShippingAddressRecord,
  toUpdateShippingAddressRecord,
} from "@/features/shipping/api/shipping-mapper";

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
  id: string
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
 * 배송지 생성
 */
export const createShippingAddress = async (
  data: CreateShippingAddressData
): Promise<ShippingAddress> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("로그인이 필요합니다.");
  }

  // 기본 배송지로 설정하는 경우, 다른 배송지들의 is_default를 false로 변경
  if (data.isDefault) {
    await supabase
      .from(TABLE_NAME)
      .update({ is_default: false })
      .eq("user_id", user.id)
      .eq("is_default", true);
  }

  const { data: newRecord, error } = await supabase
    .from(TABLE_NAME)
    .insert(toCreateShippingAddressRecord(user.id, data))
    .select()
    .single();

  if (error) {
    throw new Error(`배송지 생성 실패: ${error.message}`);
  }

  return toShippingAddressView(newRecord);
};

/**
 * 배송지 업데이트
 */
export const updateShippingAddress = async (
  id: string,
  data: UpdateShippingAddressData
): Promise<ShippingAddress> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("로그인이 필요합니다.");
  }

  // 기본 배송지로 설정하는 경우, 다른 배송지들의 is_default를 false로 변경
  if (data.isDefault === true) {
    await supabase
      .from(TABLE_NAME)
      .update({ is_default: false })
      .eq("user_id", user.id)
      .eq("is_default", true)
      .neq("id", id);
  }

  const { data: updatedRecord, error } = await supabase
    .from(TABLE_NAME)
    .update(toUpdateShippingAddressRecord(data))
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    throw new Error(`배송지 업데이트 실패: ${error.message}`);
  }

  return toShippingAddressView(updatedRecord);
};

/**
 * 배송지 삭제
 */
export const deleteShippingAddress = async (id: string): Promise<void> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("로그인이 필요합니다.");
  }

  const { error } = await supabase
    .from(TABLE_NAME)
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(`배송지 삭제 실패: ${error.message}`);
  }
};
