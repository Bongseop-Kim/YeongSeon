import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { usePopup } from "@/hooks/usePopup";
import { ROUTES } from "@/constants/ROUTES";
import {
  useDefaultShippingAddress,
  useShippingAddresses,
  shippingKeys,
} from "@/features/shipping/api/shipping-query";
import { SHIPPING_MESSAGE_TYPE } from "@yeongseon/shared/constants/shipping-events";
import type { ShippingAddress } from "@/features/shipping/types/shipping-address";

type ShippingMessageTypeValue =
  (typeof SHIPPING_MESSAGE_TYPE)[keyof typeof SHIPPING_MESSAGE_TYPE];

interface ShippingMessageData {
  type: ShippingMessageTypeValue;
  addressId: string;
}

const isShippingMessageData = (data: unknown): data is ShippingMessageData => {
  if (!data || typeof data !== "object") {
    return false;
  }

  const candidate = data as Record<string, unknown>;
  if (typeof candidate.type !== "string") {
    return false;
  }

  const allowedTypes: ShippingMessageTypeValue[] = [
    SHIPPING_MESSAGE_TYPE.ADDRESS_SELECTED,
    SHIPPING_MESSAGE_TYPE.ADDRESS_CREATED,
    SHIPPING_MESSAGE_TYPE.ADDRESS_UPDATED,
  ];

  if (!allowedTypes.includes(candidate.type as ShippingMessageTypeValue)) {
    return false;
  }

  return typeof candidate.addressId === "string" && candidate.addressId.length > 0;
};

export interface UseShippingAddressPopupReturn {
  selectedAddressId: string | null;
  selectedAddress: ShippingAddress | undefined;
  openShippingPopup: () => void;
}

export const useShippingAddressPopup = (): UseShippingAddressPopupReturn => {
  const { openPopup } = usePopup();
  const queryClient = useQueryClient();
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const initializedDefaultAddressRef = useRef(false);

  const { data: defaultAddress } = useDefaultShippingAddress();
  const { data: addresses } = useShippingAddresses();

  // 기본 배송지가 있으면 자동 선택
  useEffect(() => {
    if (defaultAddress && !initializedDefaultAddressRef.current) {
      setSelectedAddressId(defaultAddress.id);
      initializedDefaultAddressRef.current = true;
    }
  }, [defaultAddress]);

  // 팝업에서 배송지 선택/생성/업데이트 시 처리
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) {
        return;
      }

      if (!isShippingMessageData(event.data)) {
        return;
      }

      switch (event.data.type) {
        case SHIPPING_MESSAGE_TYPE.ADDRESS_SELECTED:
          setSelectedAddressId(event.data.addressId);
          break;

        case SHIPPING_MESSAGE_TYPE.ADDRESS_CREATED:
        case SHIPPING_MESSAGE_TYPE.ADDRESS_UPDATED:
          queryClient.invalidateQueries({ queryKey: shippingKeys.list() });
          queryClient.invalidateQueries({ queryKey: shippingKeys.default() });
          setSelectedAddressId(event.data.addressId);
          break;
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [queryClient]);

  const selectedAddress =
    (addresses?.find((addr) => addr.id === selectedAddressId) || defaultAddress) ?? undefined;

  const openShippingPopup = () => openPopup(`${ROUTES.SHIPPING}?mode=select`);

  return { selectedAddressId, selectedAddress, openShippingPopup };
};
