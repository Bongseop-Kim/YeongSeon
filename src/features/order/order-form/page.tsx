import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { useModalStore } from "@/store/modal";
import {
  CouponSelectModal,
  type CouponSelectModalRef,
} from "@/features/cart/components/coupon-select-modal";
import { calculateDiscount } from "@/types/coupon";
import React from "react";
import { useOrderStore } from "@/store/order";

const OrderFormPage = () => {
  const [_, setPopup] = useState<Window | null>(null);
  const navigate = useNavigate();
  const { openModal, alert } = useModalStore();
  const {
    items: orderItems,
    updateOrderItemCoupon,
    clearOrderItems,
    hasOrderItems,
  } = useOrderStore();

  useEffect(() => {
    // 주문 아이템이 없으면 장바구니로 리다이렉트
    if (!hasOrderItems()) {
      navigate("/cart");
    }
  }, [navigate, hasOrderItems]);

  const handleChangeCoupon = (itemId: string) => {
    const item = orderItems.find((i) => i.id === itemId);
    if (!item) return;

    const modalRef: { current: CouponSelectModalRef | null } = {
      current: null,
    };

    openModal({
      title: "쿠폰 사용",
      children: (
        <CouponSelectModal
          ref={(ref) => {
            modalRef.current = ref;
          }}
          currentCouponId={item.appliedCoupon?.id}
        />
      ),
      fullScreenOnMobile: true,
      confirmText: "적용",
      cancelText: "취소",
      onConfirm: () => {
        if (!modalRef.current) return;

        const selectedCoupon = modalRef.current.getSelectedCoupon();

        // 쿠폰 적용
        updateOrderItemCoupon(itemId, selectedCoupon);

        alert(
          selectedCoupon
            ? `${selectedCoupon.name}이(가) 적용되었습니다.`
            : "쿠폰 사용을 취소했습니다."
        );
      },
    });
  };

  const handleCompleteOrder = () => {
    clearOrderItems();
    alert("주문이 완료되었습니다!");
    navigate("/order/order-detail/order-1");
  };

  const openPopup = () => {
    const popup = window.open(
      "shipping",
      "popup",
      "width=430,height=650,left=200,top=100,scrollbars=yes,resizable=no"
    );
    setPopup(popup);
  };

  // 총액 계산
  const calculateTotals = () => {
    let originalPrice = 0;
    let totalDiscount = 0;

    orderItems.forEach((item) => {
      if (item.type === "product") {
        const basePrice = item.product.price;
        const optionPrice = item.selectedOption?.additionalPrice || 0;
        const itemPrice = basePrice + optionPrice;
        const itemOriginalPrice = itemPrice * item.quantity;

        originalPrice += itemOriginalPrice;

        const discount = calculateDiscount(itemPrice, item.appliedCoupon);
        const itemDiscountAmount = discount * item.quantity;

        totalDiscount += itemDiscountAmount;
      } else {
        // reform 아이템
        const itemPrice = item.reformData.cost;
        const itemOriginalPrice = itemPrice * item.quantity;

        originalPrice += itemOriginalPrice;

        const discount = calculateDiscount(itemPrice, item.appliedCoupon);
        const itemDiscountAmount = discount * item.quantity;

        totalDiscount += itemDiscountAmount;
      }
    });

    const totalPrice = originalPrice - totalDiscount;
    return { originalPrice, totalDiscount, totalPrice };
  };

  const totals = calculateTotals();

  const openPrivacyPolicyPopup = () => {
    const popup = window.open(
      "/privacy-policy",
      "popup",
      "width=430,height=650,left=200,top=100,scrollbars=yes,resizable=no"
    );
    setPopup(popup);
  };

  if (orderItems.length === 0) {
    return (
      <MainLayout>
        <MainContent>
          <div className="flex flex-col items-center justify-center min-h-96 space-y-4">
            <div>주문 데이터를 찾을 수 없습니다.</div>
            <Button onClick={() => navigate("/cart")}>
              장바구니로 돌아가기
            </Button>
          </div>
        </MainContent>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <MainContent>
        <TwoPanelLayout
          leftPanel={
            <Card>
              <CardHeader className="flex justify-between items-center">
                <CardTitle>김봉섭</CardTitle>
                <Button variant="outline" size="sm" onClick={openPopup}>
                  배송지 변경
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1 text-sm ">
                  <p>대전 동구 가양동 418-25 ESSE SION</p>
                  <p>042-462-0510</p>
                </div>
                <Select>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="배송지 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">문 앞에 놔주세요.</SelectItem>
                    <SelectItem value="2">경비실에 맡겨 주세요.</SelectItem>
                    <SelectItem value="3">택배함에 넣어 주세요.</SelectItem>
                    <SelectItem value="4">배송 전에 연락 주세요.</SelectItem>
                    <SelectItem value="5">직접입력</SelectItem>
                  </SelectContent>
                </Select>
                <Textarea
                  placeholder="최대 50자까지 입력 가능합니다."
                  className="min-h-[100px] resize-none"
                  maxLength={50}
                />
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
                <div className="flex justify-between text-base font-semibold space-y-3">
                  <span>총 결제 금액</span>
                  <span className="text-blue-600">
                    {totals.totalPrice.toLocaleString()}원
                  </span>
                </div>
                <div className="space-y-3 pt-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-600">
                      주문 내용을 확인했으며 결재에 동의합니다.
                    </span>
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-1 text-xs text-zinc-500 hover:text-zinc-700"
                      onClick={() => {}}
                    >
                      자세히
                    </Button>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-600">
                      회원님의 개인정보는 안전하게 관리됩니다.
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-1 text-xs text-zinc-500 hover:text-zinc-700"
                      onClick={openPrivacyPolicyPopup}
                    >
                      자세히
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          }
          button={
            <Button onClick={handleCompleteOrder} className="w-full" size="xl">
              결제하기
            </Button>
          }
        />
      </MainContent>
    </MainLayout>
  );
};

export default OrderFormPage;
