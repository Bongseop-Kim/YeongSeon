import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { usePopup } from "@/hooks/usePopup";
import { ROUTES } from "@/constants/ROUTES";
import { toast } from "@/lib/toast";
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

  return (
    typeof candidate.addressId === "string" && candidate.addressId.length > 0
  );
};

interface UseShippingAddressPopupReturn {
  selectedAddressId: string | null;
  selectedAddress: ShippingAddress | undefined;
  openShippingPopup: () => void;
}

export const useShippingAddressPopup = (): UseShippingAddressPopupReturn => {
  const { openPopup } = usePopup();
  const queryClient = useQueryClient();
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    null,
  );
  const initializedDefaultAddressRef = useRef(false);
  const userInteractedRef = useRef(false);

  const { data: defaultAddress } = useDefaultShippingAddress();
  const { data: addresses } = useShippingAddresses();

  // 기본 배송지가 있으면 자동 선택 (사용자가 직접 선택한 경우 덮어쓰지 않음)
  useEffect(() => {
    if (
      defaultAddress &&
      !initializedDefaultAddressRef.current &&
      !userInteractedRef.current
    ) {
      setSelectedAddressId(defaultAddress.id);
      initializedDefaultAddressRef.current = true;
    }
  }, [defaultAddress]);

  // 팝업에서 배송지 선택/생성/업데이트 시 처리
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) {
        return;
      }

      if (!isShippingMessageData(event.data)) {
        return;
      }

      userInteractedRef.current = true;
      switch (event.data.type) {
        case SHIPPING_MESSAGE_TYPE.ADDRESS_SELECTED:
          setSelectedAddressId(event.data.addressId);
          break;

        case SHIPPING_MESSAGE_TYPE.ADDRESS_CREATED:
        case SHIPPING_MESSAGE_TYPE.ADDRESS_UPDATED:
          await queryClient.invalidateQueries({
            queryKey: shippingKeys.list(),
          });
          await queryClient.invalidateQueries({
            queryKey: shippingKeys.default(),
          });
          setSelectedAddressId(event.data.addressId);
          break;
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [queryClient]);

  const selectedAddress =
    (addresses?.find((addr) => addr.id === selectedAddressId) ||
      defaultAddress) ??
    undefined;

  const openShippingPopup = () => {
    const win = openPopup(`${ROUTES.SHIPPING}?mode=select`);
    if (!win) {
      toast.error(
        "팝업이 차단되었습니다. 브라우저 설정에서 팝업을 허용해주세요.",
      );
    }
  };

  return { selectedAddressId, selectedAddress, openShippingPopup };
};
