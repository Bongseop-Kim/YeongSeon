import { useRef, useState } from "react";
import type { RefObject } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/auth";
import { toast } from "@/lib/toast";
import { hasStringCode } from "@/lib/type-guard";
import { ROUTES } from "@/constants/ROUTES";
import { useCreateCustomOrder } from "@/features/custom-order/api/custom-order-query";
import { toCreateCustomOrderInput } from "@/features/custom-order/api/custom-order-mapper";
import { useCreateQuoteRequest } from "@/features/quote-request/api/quote-request-query";
import { toCreateQuoteRequestInput } from "@/features/quote-request/api/quote-request-mapper";
import type { QuoteOrderOptions } from "@/features/custom-order/types/order";
import type { ImageUploadHook } from "@/features/custom-order/types/image-upload";
import type { ShippingAddress } from "@/features/shipping/types/shipping-address";
import type { PaymentWidgetRef } from "@/components/composite/payment-widget";

interface UseCustomOrderSubmitParams {
  selectedAddressId: string | null;
  selectedAddress: ShippingAddress | null;
  imageUpload: ImageUploadHook;
  watchedValues: QuoteOrderOptions;
  clearDraft: () => void;
  formReset: () => void;
  paymentWidgetRef: RefObject<PaymentWidgetRef | null>;
}

type PendingCustomOrderSnapshot = {
  shippingAddressId: string;
  options: ReturnType<typeof toCreateCustomOrderInput>["options"];
  quantity: number;
  referenceImages: ReturnType<
    typeof toCreateCustomOrderInput
  >["referenceImages"];
  additionalNotes: string;
};

const serializePendingOrderSnapshot = (
  snapshot: PendingCustomOrderSnapshot,
): string => JSON.stringify(snapshot);

export function useCustomOrderSubmit({
  selectedAddressId,
  selectedAddress,
  imageUpload,
  watchedValues,
  clearDraft,
  formReset,
  paymentWidgetRef,
}: UseCustomOrderSubmitParams) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isLoggedIn = !!user;
  const [isPaymentLoading, setIsPaymentLoading] = useState(false);
  const pendingOrderIdRef = useRef<string | null>(null);
  const pendingOrderSnapshotRef = useRef<string | null>(null);
  const createCustomOrder = useCreateCustomOrder();
  const createQuoteRequest = useCreateQuoteRequest();

  const isQuoteMode = watchedValues.quantity >= 100;
  const isPending = isQuoteMode
    ? createQuoteRequest.isPending
    : createCustomOrder.isPending || isPaymentLoading;
  const isSubmitDisabled =
    (isLoggedIn && (!selectedAddressId || !selectedAddress)) ||
    isPending ||
    imageUpload.isUploading;

  const handleSubmit = async () => {
    if (!user) {
      toast.error("로그인이 필요합니다.");
      navigate(ROUTES.LOGIN);
      return;
    }
    if (!selectedAddressId || !selectedAddress) {
      toast.error("배송지를 선택해주세요.");
      return;
    }
    if (isQuoteMode) {
      if (!watchedValues.contactName.trim()) {
        toast.error("담당자 성함을 입력해주세요.");
        return;
      }
      if (!watchedValues.contactValue.trim()) {
        toast.error("연락처를 입력해주세요.");
        return;
      }
    }
    if (imageUpload.isUploading) {
      toast.error("이미지 업로드가 진행 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    const {
      additionalNotes,
      contactName,
      contactTitle,
      contactMethod,
      contactValue,
      ...coreOptions
    } = watchedValues;

    // 견적요청 경로 (수량 >= 100)
    if (isQuoteMode) {
      try {
        await createQuoteRequest.mutateAsync({
          ...toCreateQuoteRequestInput({
            shippingAddressId: selectedAddressId,
            options: coreOptions,
            referenceImages: imageUpload.getImageRefs(),
            additionalNotes,
            contactName,
            contactTitle,
            contactMethod,
            contactValue,
          }),
        });
        clearDraft();
        toast.success("견적요청이 완료되었습니다!");
        formReset();
        navigate(ROUTES.ORDER_LIST);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "견적요청 처리 중 오류가 발생했습니다.",
        );
      }
      return;
    }

    // 즉시주문 경로 (수량 < 100) — 토스 결제
    if (!paymentWidgetRef.current) {
      toast.error("결제위젯이 준비되지 않았습니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    setIsPaymentLoading(true);
    try {
      const request = toCreateCustomOrderInput({
        shippingAddressId: selectedAddressId,
        options: coreOptions,
        referenceImages: imageUpload.getImageRefs(),
        additionalNotes,
      });
      const pendingSnapshot = serializePendingOrderSnapshot({
        shippingAddressId: request.shippingAddressId,
        options: request.options,
        quantity: request.quantity,
        referenceImages: request.referenceImages,
        additionalNotes: request.additionalNotes,
      });

      if (
        pendingOrderIdRef.current &&
        pendingOrderSnapshotRef.current !== pendingSnapshot
      ) {
        pendingOrderIdRef.current = null;
        pendingOrderSnapshotRef.current = null;
      }

      const orderId =
        pendingOrderIdRef.current ??
        (await createCustomOrder.mutateAsync(request)).orderId;
      pendingOrderIdRef.current = orderId;
      pendingOrderSnapshotRef.current = pendingSnapshot;

      await paymentWidgetRef.current.requestPayment({
        orderId,
        orderName: `주문제작 (수량 ${watchedValues.quantity}개)`,
        successUrl: `${window.location.origin}${ROUTES.PAYMENT_SUCCESS}`,
        failUrl: `${window.location.origin}${ROUTES.PAYMENT_FAIL}`,
        customerName: user.user_metadata?.name ?? undefined,
      });
    } catch (error) {
      if (hasStringCode(error) && error.code === "USER_CANCEL") return;
      toast.error(
        error instanceof Error
          ? error.message
          : "주문 처리 중 오류가 발생했습니다.",
      );
    } finally {
      setIsPaymentLoading(false);
    }
  };

  return { handleSubmit, isPending, isSubmitDisabled };
}
