import { describe, expect, it } from "vitest";
import {
  toShippingAddressView,
  toUpsertShippingAddressParams,
} from "@/features/shipping/api/shipping-mapper";

describe("toShippingAddressView", () => {
  it("레코드를 view 타입으로 변환한다", () => {
    expect(
      toShippingAddressView({
        id: "addr-1",
        created_at: "2026-03-15T09:00:00Z",
        recipient_name: "홍길동",
        recipient_phone: "010-1111-2222",
        address: "서울시 강남구",
        address_detail: "101호",
        postal_code: "12345",
        delivery_request: "빠른 배송",
        delivery_memo: "문 앞",
        is_default: true,
        user_id: "user-1",
      }),
    ).toEqual({
      id: "addr-1",
      recipientName: "홍길동",
      recipientPhone: "010-1111-2222",
      address: "서울시 강남구",
      detailAddress: "101호",
      postalCode: "12345",
      deliveryRequest: "빠른 배송",
      deliveryMemo: "문 앞",
      isDefault: true,
    });
  });

  it("빈 문자열과 null을 undefined로 정규화한다", () => {
    expect(
      toShippingAddressView({
        id: "addr-2",
        created_at: "2026-03-15T09:00:00Z",
        recipient_name: "홍길동",
        recipient_phone: "010-1111-2222",
        address: "서울시 강남구",
        address_detail: null,
        postal_code: "12345",
        delivery_request: "",
        delivery_memo: null,
        is_default: false,
        user_id: "user-1",
      }),
    ).toEqual(
      expect.objectContaining({
        detailAddress: undefined,
        deliveryRequest: undefined,
        deliveryMemo: undefined,
      }),
    );
  });
});

describe("toUpsertShippingAddressParams", () => {
  it("입력값을 RPC 파라미터로 변환한다", () => {
    expect(
      toUpsertShippingAddressParams("addr-1", {
        recipientName: "홍길동",
        recipientPhone: "010-1111-2222",
        address: "서울시 강남구",
        detailAddress: "101호",
        postalCode: "12345",
        deliveryRequest: "부재 시 문 앞",
        deliveryMemo: "초인종 금지",
        isDefault: true,
      }),
    ).toEqual({
      p_id: "addr-1",
      p_recipient_name: "홍길동",
      p_recipient_phone: "010-1111-2222",
      p_address: "서울시 강남구",
      p_address_detail: "101호",
      p_postal_code: "12345",
      p_delivery_request: "부재 시 문 앞",
      p_delivery_memo: "초인종 금지",
      p_is_default: true,
    });
  });

  it("선택 필드가 없으면 null/undefined로 정규화한다", () => {
    expect(
      toUpsertShippingAddressParams(null, {
        recipientName: "홍길동",
        recipientPhone: "010-1111-2222",
        address: "서울시 강남구",
        detailAddress: undefined,
        postalCode: "12345",
        deliveryRequest: undefined,
        deliveryMemo: undefined,
        isDefault: false,
      }),
    ).toEqual(
      expect.objectContaining({
        p_id: undefined,
        p_address_detail: null,
        p_delivery_request: null,
        p_delivery_memo: null,
      }),
    );
  });
});
