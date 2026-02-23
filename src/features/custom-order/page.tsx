import { useEffect, useState } from "react";
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
import type { OrderOptions } from "./types/order";
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
import { SHIPPING_MESSAGE_TYPE } from "@/features/order/constants/SHIPPING_EVENTS";
import { useQueryClient } from "@tanstack/react-query";
import { useCreateCustomOrder } from "./api/custom-order-query";
import { useImageUpload } from "./hooks/useImageUpload";

const OrderPage = () => {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode");
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { openPopup } = usePopup();
  const queryClient = useQueryClient();
  const createCustomOrder = useCreateCustomOrder();
  const imageUpload = useImageUpload();

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    null
  );

  const { data: defaultAddress } = useDefaultShippingAddress();
  const { data: addresses } = useShippingAddresses();

  // 기본 배송지가 있으면 자동 선택
  useEffect(() => {
    if (defaultAddress && !selectedAddressId) {
      setSelectedAddressId(defaultAddress.id);
    }
  }, [defaultAddress, selectedAddressId]);

  // 팝업에서 배송지 선택/생성/업데이트 시 처리
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) {
        return;
      }

      if (!event.data) return;

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

  const form = useForm<OrderOptions>({
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
    },
  });

  const watchedValues = form.watch();

  const { sewingCost, fabricCost, totalCost } =
    calculateTotalCost(watchedValues);

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

    try {
      await createCustomOrder.mutateAsync({
        shippingAddressId: selectedAddressId,
        options: watchedValues,
        quantity: watchedValues.quantity,
        referenceImageUrls: imageUpload.getImageUrls(),
        additionalNotes: watchedValues.additionalNotes,
        sample: watchedValues.sample,
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
                {!selectedAddress && (
                  <p className="text-sm text-center text-zinc-500">
                    배송지를 추가하면 주문을 진행할 수 있어요
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
