import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/constants/ROUTES";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { MainContent, MainLayout } from "@/components/layout/main-layout";
import TwoPanelLayout from "@/components/layout/two-panel-layout";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { OrderItemCard } from "./components/order-item-card";
import { ReformOrderItemCard } from "./components/reform-order-item-card";
import React from "react";
import { useOrderStore } from "@/store/order";
import { useCouponSelect } from "./hook/useCouponSelect";
import { toast } from "@/lib/toast";
import {
  useDefaultShippingAddress,
  useShippingAddresses,
  useUpdateShippingAddress,
  shippingKeys,
} from "@/features/shipping/api/shipping-query";
import { formatPhoneNumber } from "@/features/shipping/utils/phone-format";
import { useQueryClient } from "@tanstack/react-query";
import { SHIPPING_MESSAGE_TYPE } from "@/features/order/constants/SHIPPING_EVENTS";
import { calculateOrderTotals } from "@/features/order/utils/calculated-order-totals";
import { usePopup } from "@/hooks/usePopup";
import { useCreateOrder } from "@/features/order/api/order-query";
import {
  useCartItems,
  useSetCartItems,
  cartKeys,
} from "@/features/cart/api/cart-query";
import { useAuthStore } from "@/store/auth";

const OrderFormPage = () => {
  const { openPopup } = usePopup();
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    null
  );
  const navigate = useNavigate();
  const {
    items: orderItems,
    clearOrderItems,
    hasOrderItems,
    updateOrderItemCoupon,
  } = useOrderStore();
  const { openCouponSelect } = useCouponSelect();
  const queryClient = useQueryClient();
  const { data: defaultAddress } = useDefaultShippingAddress();
  const { data: addresses } = useShippingAddresses();
  const updateShippingAddress = useUpdateShippingAddress();
  const createOrder = useCreateOrder();
  const { data: cartItems = [] } = useCartItems();
  const setCartItems = useSetCartItems();
  const { user } = useAuthStore();

  useEffect(() => {
    // 주문 아이템이 없으면 장바구니로 리다이렉트
    if (!hasOrderItems()) {
      navigate(ROUTES.CART);
    }
  }, [navigate, hasOrderItems]);

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

  // 선택된 배송지 정보
  const selectedAddress =
    addresses?.find((addr) => addr.id === selectedAddressId) || defaultAddress;

  const handleChangeCoupon = async (itemId: string) => {
    const item = orderItems.find((i) => i.id === itemId);
    if (!item) return;

    const selectedCoupon = await openCouponSelect(item.appliedCoupon?.id);

    // 쿠폰 적용 (null이면 쿠폰 제거)
    updateOrderItemCoupon(itemId, selectedCoupon ?? undefined);

    // 성공 메시지 표시
    toast.success(
      selectedCoupon
        ? `${selectedCoupon.coupon.name}이(가) 적용되었습니다.`
        : "쿠폰 사용을 취소했습니다."
    );
  };

  const handleCompleteOrder = async () => {
    if (!selectedAddressId || !selectedAddress) {
      toast.error("배송지를 선택해주세요.");
      return;
    }

    if (orderItems.length === 0) {
      toast.error("주문할 상품이 없습니다.");
      return;
    }

    try {
      const result = await createOrder.mutateAsync({
        items: orderItems,
        shippingAddressId: selectedAddressId,
        totals: calculateOrderTotals(orderItems),
      });

      // 주문한 아이템 ID 목록
      const orderedItemIds = new Set(orderItems.map((item) => item.id));

      // 장바구니에서 주문한 아이템 제거
      const remainingCartItems = cartItems.filter(
        (cartItem) => !orderedItemIds.has(cartItem.id)
      );

      // 장바구니 업데이트 (주문한 아이템이 장바구니에 있는 경우에만)
      if (cartItems.length > remainingCartItems.length) {
        try {
          await setCartItems.mutateAsync(remainingCartItems);
          // 장바구니 쿼리 무효화 및 재조회하여 모든 컴포넌트에 즉시 반영
          if (user?.id) {
            // 쿼리 캐시 즉시 업데이트
            queryClient.setQueryData(
              cartKeys.items(user.id),
              remainingCartItems
            );
            // 쿼리 무효화 및 재조회
            await queryClient.invalidateQueries({
              queryKey: cartKeys.items(user.id),
            });
            await queryClient.refetchQueries({
              queryKey: cartKeys.items(user.id),
            });
          }
        } catch (cartError) {
          console.warn("장바구니 업데이트 실패:", cartError);
          // 장바구니 업데이트 실패는 주문 실패로 처리하지 않음 (경고만)
        }
      }

      clearOrderItems();
      toast.success("주문이 완료되었습니다!");
      navigate(`${ROUTES.ORDER_DETAIL}/${result.orderId}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "주문 처리 중 오류가 발생했습니다.";
      toast.error(errorMessage);
    }
  };

  const totals = calculateOrderTotals(orderItems);

  if (orderItems.length === 0) {
    return (
      <MainLayout>
        <MainContent>
          <div className="flex flex-col items-center justify-center min-h-96 space-y-4">
            <div>주문 데이터를 찾을 수 없습니다.</div>
            <Button onClick={() => navigate(ROUTES.CART)}>
              장바구니로 돌아가기
            </Button>
          </div>
        </MainContent>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <MainContent className="overflow-visible">
        <TwoPanelLayout
          leftPanel={
            <Card>
              <CardHeader className="flex justify-between items-center">
                <CardTitle>
                  {selectedAddress?.recipientName || "배송지 정보"}
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openPopup(`${ROUTES.SHIPPING}?mode=select`)}
                >
                  배송지 관리
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedAddress ? (
                  <>
                    <div className="space-y-1 text-sm">
                      <p>
                        ({selectedAddress.postalCode}) {selectedAddress.address}{" "}
                        {selectedAddress.detailAddress}
                      </p>
                      <p>{formatPhoneNumber(selectedAddress.recipientPhone)}</p>
                    </div>
                    <Select
                      value={selectedAddress.deliveryRequest || undefined}
                      onValueChange={(value) => {
                        if (selectedAddressId) {
                          updateShippingAddress.mutate({
                            id: selectedAddressId,
                            data: {
                              deliveryRequest: value,
                            },
                          });
                        }
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="배송 요청사항 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DELIVERY_REQUEST_1">
                          문 앞에 놔주세요.
                        </SelectItem>
                        <SelectItem value="DELIVERY_REQUEST_2">
                          경비실에 맡겨 주세요.
                        </SelectItem>
                        <SelectItem value="DELIVERY_REQUEST_3">
                          택배함에 넣어 주세요.
                        </SelectItem>
                        <SelectItem value="DELIVERY_REQUEST_4">
                          배송 전에 연락 주세요.
                        </SelectItem>
                        <SelectItem value="DELIVERY_REQUEST_5">
                          직접입력
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {selectedAddress.deliveryRequest ===
                      "DELIVERY_REQUEST_5" && (
                      <Textarea
                        placeholder="최대 50자까지 입력 가능합니다."
                        className="min-h-[100px] resize-none"
                        maxLength={50}
                        value={selectedAddress.deliveryMemo || ""}
                        readOnly
                      />
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 text-zinc-500">
                    배송지를 추가해주세요.
                  </div>
                )}
              </CardContent>

              <CardContent>
                <Separator />
              </CardContent>

              <CardHeader>
                <CardTitle>주문 상품 {orderItems.length}개</CardTitle>
              </CardHeader>

              {orderItems.map((item, index) => (
                <React.Fragment key={item.id}>
                  {item.type === "product" ? (
                    <OrderItemCard
                      item={item}
                      onChangeCoupon={() => handleChangeCoupon(item.id)}
                    />
                  ) : (
                    <ReformOrderItemCard
                      item={item}
                      onChangeCoupon={() => handleChangeCoupon(item.id)}
                    />
                  )}
                  {index < orderItems.length - 1 && <Separator />}
                </React.Fragment>
              ))}
            </Card>
          }
          rightPanel={
            <Card>
              <CardHeader>
                <CardTitle>결제 금액</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-600">상품 금액</span>
                  <span>{totals.originalPrice.toLocaleString()}원</span>
                </div>
                {totals.totalDiscount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-600">할인 금액</span>
                    <span className="text-red-500">
                      -{totals.totalDiscount.toLocaleString()}원
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-600">배송비</span>
                  <span>무료</span>
                </div>
                <Separator />
                <div className="flex justify-between text-base font-semibold">
                  <span>총 결제 금액</span>
                  <span className="text-blue-600">
                    {totals.totalPrice.toLocaleString()}원
                  </span>
                </div>
                <div className="space-y-3 pt-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-600">
                      주문 내용을 확인했으며 결제에 동의합니다.
                    </span>
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-1 text-xs text-zinc-500 hover:text-zinc-700"
                      onClick={() => openPopup(ROUTES.TERMS_OF_SERVICE)}
                    >
                      자세히
                    </Button>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-600">
                      회원님의 개인정보는 안전하게 관리됩니다.
                    </span>
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-1 text-xs text-zinc-500 hover:text-zinc-700"
                      onClick={() => openPopup(ROUTES.PRIVACY_POLICY)}
                    >
                      자세히
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          }
          button={
            <div className="space-y-2">
              <Button
                onClick={handleCompleteOrder}
                className="w-full"
                size="xl"
                disabled={!selectedAddress || createOrder.isPending}
              >
                {createOrder.isPending ? "결제 처리 중..." : "결제하기"}
              </Button>
              {!selectedAddress && (
                <p className="text-sm text-center text-zinc-500">
                  배송지를 추가하면 결제를 진행할 수 있어요
                </p>
              )}
            </div>
          }
        />
      </MainContent>
    </MainLayout>
  );
};

export default OrderFormPage;
