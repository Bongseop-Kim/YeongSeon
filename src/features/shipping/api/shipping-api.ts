import { supabase } from "@/lib/supabase";
import type { ShippingAddress } from "@/features/shipping/types/shipping-address";
import type {
  ShippingAddressRecord,
  CreateShippingAddressData,
  UpdateShippingAddressData,
} from "@/features/shipping/types/shipping-address-record";

const TABLE_NAME = "shipping_addresses";

/**
 * 레코드를 ShippingAddress 타입으로 변환
 */
const mapRecordToShippingAddress = (
  record: ShippingAddressRecord
): ShippingAddress => {
  return {
    id: record.id,
    recipientName: record.recipient_name,
    recipientPhone: record.recipient_phone,
    address: record.address,
    detailAddress: record.address_detail,
    postalCode: record.postal_code,
    deliveryRequest: record.delivery_request || undefined,
    deliveryMemo: record.delivery_memo || undefined,
    isDefault: record.is_default,
  };
};

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

  return data.map(mapRecordToShippingAddress);
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

    return mapRecordToShippingAddress(data);
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

  return mapRecordToShippingAddress(data);
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
    .insert({
      user_id: user.id,
      recipient_name: data.recipientName,
      recipient_phone: data.recipientPhone,
      address: data.address,
      address_detail: data.detailAddress,
      postal_code: data.postalCode,
      delivery_request: data.deliveryRequest || null,
      delivery_memo: data.deliveryMemo || null,
      is_default: data.isDefault,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`배송지 생성 실패: ${error.message}`);
  }

  return mapRecordToShippingAddress(newRecord);
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

  const updateData: Partial<ShippingAddressRecord> = {};
  if (data.recipientName !== undefined)
    updateData.recipient_name = data.recipientName;
  if (data.recipientPhone !== undefined)
    updateData.recipient_phone = data.recipientPhone;
  if (data.address !== undefined) updateData.address = data.address;
  if (data.detailAddress !== undefined)
    updateData.address_detail = data.detailAddress;
  if (data.postalCode !== undefined) updateData.postal_code = data.postalCode;
  if (data.deliveryRequest !== undefined)
    updateData.delivery_request = data.deliveryRequest;
  if (data.deliveryMemo !== undefined)
    updateData.delivery_memo = data.deliveryMemo;
  if (data.isDefault !== undefined) updateData.is_default = data.isDefault;

  const { data: updatedRecord, error } = await supabase
    .from(TABLE_NAME)
    .update(updateData)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    throw new Error(`배송지 업데이트 실패: ${error.message}`);
  }

  return mapRecordToShippingAddress(updatedRecord);
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
