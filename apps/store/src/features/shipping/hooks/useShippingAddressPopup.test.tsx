import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useShippingAddressPopup } from "@/features/shipping/hooks/useShippingAddressPopup";
import { SHIPPING_MESSAGE_TYPE } from "@yeongseon/shared/constants/shipping-events";

const {
  openPopup,
  invalidateQueries,
  error,
  useDefaultShippingAddress,
  useShippingAddresses,
} = vi.hoisted(() => ({
  openPopup: vi.fn(),
  invalidateQueries: vi.fn(),
  error: vi.fn(),
  useDefaultShippingAddress: vi.fn(),
  useShippingAddresses: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    invalidateQueries,
  }),
}));

vi.mock("@/hooks/usePopup", () => ({
  usePopup: () => ({
    openPopup,
  }),
}));

vi.mock("@/lib/toast", () => ({
  toast: {
    error,
  },
}));

vi.mock("@/features/shipping/api/shipping-query", () => ({
  shippingKeys: {
    list: () => ["shipping", "list"],
    default: () => ["shipping", "default"],
  },
  useDefaultShippingAddress,
  useShippingAddresses,
}));

const defaultAddress = {
  id: "addr-default",
  recipientName: "홍길동",
};

const addresses = [
  defaultAddress,
  {
    id: "addr-2",
    recipientName: "김철수",
  },
];

describe("useShippingAddressPopup", () => {
  beforeEach(() => {
    openPopup.mockReset();
    invalidateQueries.mockReset();
    error.mockReset();
    useDefaultShippingAddress.mockReturnValue({ data: defaultAddress });
    useShippingAddresses.mockReturnValue({ data: addresses });
  });

  it("기본 배송지를 자동 선택하고 팝업을 연다", () => {
    openPopup.mockReturnValue({});
    const { result } = renderHook(() => useShippingAddressPopup());

    expect(result.current.selectedAddressId).toBe("addr-default");
    expect(result.current.selectedAddress).toEqual(defaultAddress);

    act(() => {
      result.current.openShippingPopup();
    });
    expect(openPopup).toHaveBeenCalledWith("/shipping?mode=select");
  });

  it("message 이벤트로 선택/생성/업데이트를 처리한다", async () => {
    const { result } = renderHook(() => useShippingAddressPopup());

    await act(async () => {
      window.dispatchEvent(
        new MessageEvent("message", {
          origin: window.location.origin,
          data: {
            type: SHIPPING_MESSAGE_TYPE.ADDRESS_SELECTED,
            addressId: "addr-2",
          },
        }),
      );
    });
    expect(result.current.selectedAddressId).toBe("addr-2");
    expect(result.current.selectedAddress).toEqual(addresses[1]);

    await act(async () => {
      window.dispatchEvent(
        new MessageEvent("message", {
          origin: window.location.origin,
          data: {
            type: SHIPPING_MESSAGE_TYPE.ADDRESS_CREATED,
            addressId: "addr-2",
          },
        }),
      );
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["shipping", "list"],
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["shipping", "default"],
    });

    await act(async () => {
      window.dispatchEvent(
        new MessageEvent("message", {
          origin: window.location.origin,
          data: {
            type: SHIPPING_MESSAGE_TYPE.ADDRESS_UPDATED,
            addressId: "addr-default",
          },
        }),
      );
    });
    expect(result.current.selectedAddressId).toBe("addr-default");
    expect(result.current.selectedAddress).toEqual(defaultAddress);
  });

  it("잘못된 message는 무시한다", async () => {
    renderHook(() => useShippingAddressPopup());

    await act(async () => {
      window.dispatchEvent(
        new MessageEvent("message", {
          origin: "https://evil.example.com",
          data: {
            type: SHIPPING_MESSAGE_TYPE.ADDRESS_UPDATED,
            addressId: "addr-2",
          },
        }),
      );
      window.dispatchEvent(
        new MessageEvent("message", {
          origin: window.location.origin,
          data: { type: "INVALID", addressId: "" },
        }),
      );
    });
    expect(invalidateQueries).not.toHaveBeenCalled();
  });

  it("팝업 차단을 처리한다", () => {
    openPopup.mockReturnValue(null);
    const { result } = renderHook(() => useShippingAddressPopup());
    act(() => {
      result.current.openShippingPopup();
    });
    expect(error).toHaveBeenCalledWith(
      "팝업이 차단되었습니다. 브라우저 설정에서 팝업을 허용해주세요.",
    );
  });
});
