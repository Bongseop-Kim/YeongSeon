import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/auth";
import { toast } from "@/lib/toast";
import { ROUTES } from "@/constants/ROUTES";
import { useCreateCustomOrder } from "../api/custom-order-query";
import { toCreateCustomOrderInput } from "../api/custom-order-mapper";
import { useCreateQuoteRequest } from "@/features/quote-request/api/quote-request-query";
import { toCreateQuoteRequestInput } from "@/features/quote-request/api/quote-request-mapper";
import type { QuoteOrderOptions } from "../types/order";
import type { ImageUploadHook } from "../types/image-upload";
import type { ShippingAddress } from "@/features/shipping/types/shipping-address";

interface UseCustomOrderSubmitParams {
  selectedAddressId: string | null;
  selectedAddress: ShippingAddress | null;
  imageUpload: ImageUploadHook;
  watchedValues: QuoteOrderOptions;
  clearDraft: () => void;
  formReset: () => void;
}

export function useCustomOrderSubmit({
  selectedAddressId,
  selectedAddress,
  imageUpload,
  watchedValues,
  clearDraft,
  formReset,
}: UseCustomOrderSubmitParams) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isLoggedIn = !!user;
  const createCustomOrder = useCreateCustomOrder();
  const createQuoteRequest = useCreateQuoteRequest();

  const isQuoteMode = watchedValues.quantity >= 100;
  const isPending = isQuoteMode
    ? createQuoteRequest.isPending
    : createCustomOrder.isPending;
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
      referenceImages,
      additionalNotes,
      sample,
      sampleType,
      contactName,
      contactTitle,
      contactMethod,
      contactValue,
      ...coreOptions
    } = watchedValues;

    try {
      if (isQuoteMode) {
        await createQuoteRequest.mutateAsync({
          ...toCreateQuoteRequestInput({
            shippingAddressId: selectedAddressId,
            options: coreOptions,
            referenceImageUrls: imageUpload.getImageUrls(),
            additionalNotes,
            contactName,
            contactTitle,
            contactMethod,
            contactValue,
          }),
        });
        clearDraft();
        toast.success("견적요청이 완료되었습니다!");
      } else {
        await createCustomOrder.mutateAsync({
          ...toCreateCustomOrderInput({
            shippingAddressId: selectedAddressId,
            options: coreOptions,
            referenceImageUrls: imageUpload.getImageUrls(),
            additionalNotes,
            sample,
            sampleType,
          }),
        });
        clearDraft();
        toast.success("주문이 완료되었습니다!");
      }
      formReset();
      navigate(ROUTES.ORDER_LIST);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : isQuoteMode
            ? "견적요청 처리 중 오류가 발생했습니다."
            : "주문 처리 중 오류가 발생했습니다.";
      toast.error(errorMessage);
    }
  };

  return { handleSubmit, isPending, isSubmitDisabled };
}
