import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/shared/store/auth";
import { toast } from "@/shared/lib/toast";
import { ROUTES } from "@/shared/constants/ROUTES";
import {
  toCreateQuoteRequestInput,
  useCreateQuoteRequest,
} from "@/entities/quote-request";
import type {
  QuoteOrderOptions,
  ImageUploadHook,
} from "@/entities/custom-order";
import type { ShippingAddress } from "@/entities/shipping";
import type { CustomOrderPaymentState } from "@/shared/lib/custom-payment-state";

interface UseCustomOrderSubmitParams {
  selectedAddressId: string | null;
  selectedAddress: ShippingAddress | null;
  imageUpload: ImageUploadHook;
  watchedValues: QuoteOrderOptions;
  formReset: () => void;
  totalCost: number;
}

export function useCustomOrderSubmit({
  selectedAddressId,
  selectedAddress,
  imageUpload,
  watchedValues,
  formReset,
  totalCost,
}: UseCustomOrderSubmitParams) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isLoggedIn = !!user;
  const createQuoteRequest = useCreateQuoteRequest();

  const isQuoteMode = watchedValues.quantity >= 100;
  const isPending = createQuoteRequest.isPending;
  const hasSelectedAddress = !!selectedAddressId && !!selectedAddress;
  const isSubmitDisabled =
    (isQuoteMode && isLoggedIn && !hasSelectedAddress) ||
    isPending ||
    imageUpload.isUploading;

  const handleSubmit = async () => {
    if (isQuoteMode) {
      if (!user) {
        toast.error("로그인이 필요합니다.");
        navigate(ROUTES.LOGIN);
        return;
      }
      if (!hasSelectedAddress) {
        toast.error("배송지를 선택해주세요.");
        return;
      }
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
      if (!selectedAddressId) {
        toast.error("배송지를 선택해주세요.");
        return;
      }
      const shippingAddressId = selectedAddressId;
      try {
        await createQuoteRequest.mutateAsync({
          ...toCreateQuoteRequestInput({
            shippingAddressId,
            options: coreOptions,
            referenceImages: imageUpload.getImageRefs(),
            additionalNotes,
            contactName,
            contactTitle,
            contactMethod,
            contactValue,
          }),
        });
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

    // 즉시주문 경로 (수량 < 100) — 결제 페이지로 이동
    const state: CustomOrderPaymentState = {
      orderType: "custom",
      coreOptions,
      imageRefs: imageUpload.getImageRefs(),
      additionalNotes,
      totalCost,
      ...(selectedAddressId ? { shippingAddressId: selectedAddressId } : {}),
    };
    navigate(ROUTES.CUSTOM_PAYMENT, { state });
  };

  return { handleSubmit, isPending, isSubmitDisabled };
}
