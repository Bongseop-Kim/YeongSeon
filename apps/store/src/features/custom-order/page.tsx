import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MainLayout, MainContent } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import OrderForm from "./components/OrderForm";
import CostBreakdown from "./components/CostBreakdown";
import type { QuoteOrderOptions } from "./types/order";
import { Form } from "@/components/ui/form";
import TwoPanelLayout from "@/components/layout/two-panel-layout";
import { calculateTotalCost } from "./utils/pricing";
import { useAuthStore } from "@/store/auth";
import { toast } from "@/lib/toast";
import { ROUTES } from "@/constants/ROUTES";
import { usePopup } from "@/hooks/usePopup";
import {
  useDefaultShippingAddress,
  useShippingAddresses,
  shippingKeys,
} from "@/features/shipping/api/shipping-query";
import { formatPhoneNumber } from "@/features/shipping/utils/phone-format";
import { SHIPPING_MESSAGE_TYPE } from "@yeongseon/shared/constants/shipping-events";
import { useQueryClient } from "@tanstack/react-query";
import { useCreateCustomOrder } from "@/features/custom-order/api/custom-order-query";
import { useImageUpload } from "@/features/custom-order/hooks/useImageUpload";
import { toCreateCustomOrderInput } from "@/features/custom-order/api/custom-order-mapper";
import { useCreateQuoteRequest } from "@/features/quote-request/api/quote-request-query";
import { toCreateQuoteRequestInput } from "@/features/quote-request/api/quote-request-mapper";
import { ContactInfoSection } from "@/features/quote-request/components/ContactInfoSection";

type ShippingMessageTypeValue =
  (typeof SHIPPING_MESSAGE_TYPE)[keyof typeof SHIPPING_MESSAGE_TYPE];

interface ShippingMessageData {
  type: ShippingMessageTypeValue;
  addressId: string;
}

const isShippingMessageData = (
  data: unknown
): data is ShippingMessageData => {
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

const OrderPage = () => {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode");
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { openPopup } = usePopup();
  const queryClient = useQueryClient();
  const createCustomOrder = useCreateCustomOrder();
  const createQuoteRequest = useCreateQuoteRequest();
  const imageUpload = useImageUpload();

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    null
  );
  const initializedDefaultAddressRef = useRef(false);

  const { data: defaultAddress } = useDefaultShippingAddress();
  const { data: addresses } = useShippingAddresses();

  // 기본 배송지가 있으면 자동 선택
  useEffect(() => {
    if (
      defaultAddress &&
      !initializedDefaultAddressRef.current
    ) {
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
    addresses?.find((addr) => addr.id === selectedAddressId) || defaultAddress;

  const form = useForm<QuoteOrderOptions>({
    defaultValues: {
      // 원단 정보
      fabricProvided: false,
      reorder: false,
      fabricType: "POLY",
      designType: "PRINTING",

      // 제작 옵션
      tieType: "MANUAL",
      interlining: "POLY",
      interliningThickness: "THICK",
      sizeType: "ADULT",
      tieWidth: 8,

      // 추가 옵션
      triangleStitch: true,
      sideStitch: true,
      barTack: false,
      fold7: false,
      dimple: false,
      spoderato: false,

      // 라벨 옵션
      brandLabel: false,
      careLabel: false,

      // 주문 정보
      quantity: 4,
      referenceImages: null,
      additionalNotes: "",
      sample: false,

      // 견적요청 연락처
      contactName: "",
      contactTitle: "",
      contactMethod: "phone",
      contactValue: "",
    },
  });

  const watchedValues = form.watch();

  const { sewingCost, fabricCost, totalCost } =
    calculateTotalCost(watchedValues);

  const isQuoteMode = watchedValues.quantity >= 100;

  const handleCreateQuoteRequest = async () => {
    if (!user) {
      toast.error("로그인이 필요합니다.");
      navigate(ROUTES.LOGIN);
      return;
    }

    if (!selectedAddressId || !selectedAddress) {
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

    if (imageUpload.isUploading) {
      toast.error("이미지 업로드가 진행 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    const {
      referenceImages,
      additionalNotes,
      sample,
      contactName,
      contactTitle,
      contactMethod,
      contactValue,
      ...optionsWithoutExtra
    } = watchedValues;

    try {
      await createQuoteRequest.mutateAsync({
        ...toCreateQuoteRequestInput({
          shippingAddressId: selectedAddressId,
          options: optionsWithoutExtra,
          referenceImageUrls: imageUpload.getImageUrls(),
          additionalNotes,
          contactName,
          contactTitle,
          contactMethod,
          contactValue,
        }),
      });

      toast.success("견적요청이 완료되었습니다!");
      form.reset();
      navigate(ROUTES.ORDER_LIST);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "견적요청 처리 중 오류가 발생했습니다.";
      toast.error(errorMessage);
    }
  };

  const handleCreateOrder = async () => {
    if (!user) {
      toast.error("로그인이 필요합니다.");
      navigate(ROUTES.LOGIN);
      return;
    }

    if (!selectedAddressId || !selectedAddress) {
      toast.error("배송지를 선택해주세요.");
      return;
    }

    if (imageUpload.isUploading) {
      toast.error("이미지 업로드가 진행 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    const {
      referenceImages,
      additionalNotes,
      sample,
      contactName,
      contactTitle,
      contactMethod,
      contactValue,
      ...optionsWithoutReferenceImages
    } = watchedValues;

    try {
      await createCustomOrder.mutateAsync({
        ...toCreateCustomOrderInput({
          shippingAddressId: selectedAddressId,
          options: optionsWithoutReferenceImages,
          referenceImageUrls: imageUpload.getImageUrls(),
          additionalNotes,
          sample,
        }),
      });

      toast.success("주문이 완료되었습니다!");
      form.reset();
      navigate(ROUTES.ORDER_LIST);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "주문 처리 중 오류가 발생했습니다.";
      toast.error(errorMessage);
    }
  };

  return (
    <MainLayout>
      <MainContent className="overflow-visible">
        <Form {...form}>
          <TwoPanelLayout
            leftPanel={
              <OrderForm
                control={form.control}
                watch={form.watch}
                imageUpload={imageUpload}
              />
            }
            rightPanel={
              <div className="space-y-4">
                {isQuoteMode && (
                  <ContactInfoSection
                    control={form.control}
                    contactMethod={watchedValues.contactMethod}
                  />
                )}

                <Card>
                  <CardHeader className="flex justify-between items-center">
                    <CardTitle>
                      {selectedAddress?.recipientName || "배송지 정보"}
                    </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        openPopup(`${ROUTES.SHIPPING}?mode=select`)
                      }
                    >
                      배송지 관리
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {selectedAddress ? (
                      <div className="space-y-1 text-sm">
                        <p>
                          ({selectedAddress.postalCode}){" "}
                          {selectedAddress.address}{" "}
                          {selectedAddress.detailAddress}
                        </p>
                        <p>
                          {formatPhoneNumber(selectedAddress.recipientPhone)}
                        </p>
                      </div>
                    ) : (
                      <div className="text-center py-4 text-zinc-500 text-sm">
                        배송지를 추가해주세요.
                      </div>
                    )}
                  </CardContent>
                </Card>

                <CostBreakdown
                  options={watchedValues}
                  totalCost={totalCost}
                  sewingCost={sewingCost}
                  fabricCost={fabricCost}
                  mode={mode}
                />
              </div>
            }
            button={
              <div className="space-y-2">
                {isQuoteMode ? (
                  <Button
                    type="button"
                    onClick={handleCreateQuoteRequest}
                    size="xl"
                    className="w-full"
                    disabled={
                      !selectedAddress ||
                      createQuoteRequest.isPending ||
                      imageUpload.isUploading
                    }
                  >
                    {createQuoteRequest.isPending
                      ? "견적요청 처리 중..."
                      : "견적요청"}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={handleCreateOrder}
                    size="xl"
                    className="w-full"
                    disabled={
                      !selectedAddress ||
                      createCustomOrder.isPending ||
                      imageUpload.isUploading
                    }
                  >
                    {createCustomOrder.isPending
                      ? "주문 처리 중..."
                      : `${totalCost.toLocaleString()}원 주문하기`}
                  </Button>
                )}
                {!selectedAddress && (
                  <p className="text-sm text-center text-zinc-500">
                    배송지를 추가하면 {isQuoteMode ? "견적요청" : "주문"}을 진행할 수 있어요
                  </p>
                )}
              </div>
            }
          />
        </Form>
      </MainContent>
    </MainLayout>
  );
};

export default OrderPage;
