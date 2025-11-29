import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import TwoPanelLayout from "@/components/layout/two-panel-layout";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useModalStore } from "@/store/modal";
import { MainContent, MainLayout } from "@/components/layout/main-layout";
import React, { useState, useMemo } from "react";
import { Empty } from "@/components/composite/empty";
import { useNavigate } from "react-router-dom";
import { useCartStore } from "@/store/cart";
import { CartItemCard } from "./components/cart-item-card";
import { ReformCartItemCard } from "./components/reform-cart-item-card";
import {
  OptionChangeModal,
  type OptionChangeModalRef,
} from "./components/option-change-modal";
import {
  ReformOptionChangeModal,
  type ReformOptionChangeModalRef,
} from "./components/reform-option-change-modal";
import {
  CouponSelectModal,
  type CouponSelectModalRef,
} from "./components/coupon-select-modal";
import { ProductCard } from "../shop/components/product-card";
import { PRODUCTS_DATA } from "../shop/constants/PRODUCTS_DATA";
import { calculateDiscount } from "@/types/coupon";

const CartPage = () => {
  const { openModal, confirm } = useModalStore();
  const navigate = useNavigate();
  const { items, removeFromCart, addToCart, updateReformOption, applyCoupon } = useCartStore();
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(items.map((item) => item.id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectItem = (itemId: string, checked: boolean) => {
    if (checked) {
      setSelectedItems([...selectedItems, itemId]);
    } else {
      setSelectedItems(selectedItems.filter((id) => id !== itemId));
    }
  };

  const handleRemoveSelected = () => {
    if (selectedItems.length === 0) {
      confirm("삭제할 상품을 선택해주세요.");
      return;
    }

    confirm("선택한 상품을 삭제하시겠습니까?", () => {
      selectedItems.forEach((itemId) => {
        removeFromCart(itemId);
      });
      setSelectedItems([]);
    });
  };

  const handleChangeOption = (itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    if (!item || item.type !== "product") return;

    const modalRef: { current: OptionChangeModalRef | null } = {
      current: null,
    };

    openModal({
      title: "옵션/수량 변경",
      children: (
        <OptionChangeModal
          ref={(ref) => {
            modalRef.current = ref;
          }}
          item={item}
        />
      ),
      confirmText: "변경",
      cancelText: "취소",
      onConfirm: () => {
        if (!modalRef.current) return;

        const { quantity, optionId } = modalRef.current.getValues();

        // 옵션이나 수량이 변경되었는지 확인
        const hasChanges =
          quantity !== item.quantity || optionId !== item.selectedOption?.id;

        if (!hasChanges) {
          confirm("변경 사항이 없습니다.");
          return;
        }

        // 기존 아이템 제거
        removeFromCart(itemId);

        // 새로운 옵션으로 추가
        const newOption = optionId
          ? item.product.options?.find((opt) => opt.id === optionId)
          : undefined;

        addToCart(item.product, {
          option: newOption,
          quantity: quantity,
        });
      },
    });
  };

  const handleChangeReformOption = (itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    if (!item || item.type !== "reform") return;

    const modalRef: { current: ReformOptionChangeModalRef | null } = {
      current: null,
    };

    openModal({
      title: "수선 옵션 변경",
      children: (
        <ReformOptionChangeModal
          ref={(ref) => {
            modalRef.current = ref;
          }}
          item={item}
        />
      ),
      confirmText: "변경",
      cancelText: "취소",
      onConfirm: () => {
        if (!modalRef.current) return;

        const updatedTie = modalRef.current.getValues();

        // 옵션이 변경되었는지 확인
        const hasChanges =
          updatedTie.measurementType !== item.reformData.tie.measurementType ||
          updatedTie.tieLength !== item.reformData.tie.tieLength ||
          updatedTie.wearerHeight !== item.reformData.tie.wearerHeight;

        if (!hasChanges) {
          confirm("변경 사항이 없습니다.");
          return;
        }

        // 옵션 업데이트
        updateReformOption(itemId, updatedTie);
        confirm("수선 옵션이 변경되었습니다.");
      },
    });
  };

  const handleChangeCoupon = (itemId: string) => {
    const item = items.find((i) => i.id === itemId);
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
      confirmText: "적용",
      cancelText: "취소",
      onConfirm: () => {
        if (!modalRef.current) return;

        const selectedCoupon = modalRef.current.getSelectedCoupon();

        // 쿠폰 적용
        applyCoupon(itemId, selectedCoupon);

        confirm(
          selectedCoupon
            ? `${selectedCoupon.name}이(가) 적용되었습니다.`
            : "쿠폰 사용을 취소했습니다."
        );
      },
    });
  };

  const handleOrder = () => {
    if (selectedItems.length === 0) {
      confirm("주문할 상품을 선택해주세요.");
      return;
    }

    // 선택된 상품들만 필터링
    const selectedCartItems = items.filter((item) =>
      selectedItems.includes(item.id)
    );

    // 선택된 상품들을 localStorage에 저장
    localStorage.setItem("orderItems", JSON.stringify(selectedCartItems));

    // 주문 페이지로 이동
    navigate("/order/order-form");
  };

  // 선택된 상품의 총액 계산
  const selectedTotals = useMemo(() => {
    const selectedCartItems = items.filter((item) =>
      selectedItems.includes(item.id)
    );

    const totalQuantity = selectedCartItems.reduce(
      (total, item) => total + item.quantity,
      0
    );

    let originalPrice = 0;
    let totalDiscount = 0;

    const totalPrice = selectedCartItems.reduce((total, item) => {
      if (item.type === "product") {
        const basePrice = item.product.price;
        const optionPrice = item.selectedOption?.additionalPrice || 0;
        const itemPrice = basePrice + optionPrice;
        const itemOriginalPrice = itemPrice * item.quantity;

        originalPrice += itemOriginalPrice;

        const discount = calculateDiscount(itemPrice, item.appliedCoupon);
        const itemDiscountAmount = discount * item.quantity;

        totalDiscount += itemDiscountAmount;

        const finalPrice = itemOriginalPrice - itemDiscountAmount;
        return total + finalPrice;
      } else {
        // reform 아이템
        const itemPrice = item.reformData.cost;
        const itemOriginalPrice = itemPrice * item.quantity;

        originalPrice += itemOriginalPrice;

        const discount = calculateDiscount(itemPrice, item.appliedCoupon);
        const itemDiscountAmount = discount * item.quantity;

        totalDiscount += itemDiscountAmount;

        const finalPrice = itemOriginalPrice - itemDiscountAmount;
        return total + finalPrice;
      }
    }, 0);

    return { totalQuantity, originalPrice, totalDiscount, totalPrice };
  }, [items, selectedItems]);

  // 장바구니 상품 기반 추천 상품 찾기
  const similarProducts = useMemo(() => {
    if (items.length === 0) return [];

    // product 타입의 아이템만 필터링
    const productItems = items.filter((item) => item.type === "product");
    if (productItems.length === 0) return [];

    // 장바구니에 있는 상품 ID들
    const cartProductIds = new Set(
      productItems.map((item) => item.product.id)
    );

    // 장바구니 상품들의 속성 수집
    const cartProperties = productItems.map((item) => ({
      category: item.product.category,
      color: item.product.color,
      pattern: item.product.pattern,
      material: item.product.material,
    }));

    // 추천 상품 찾기
    return PRODUCTS_DATA.filter((product) => {
      // 이미 장바구니에 있는 상품 제외
      if (cartProductIds.has(product.id)) return false;

      // 장바구니 상품들과 하나 이상의 속성이 일치하는 상품
      return cartProperties.some(
        (props) =>
          product.category === props.category ||
          product.color === props.color ||
          product.pattern === props.pattern ||
          product.material === props.material
      );
    }).slice(0, 8); // 최대 8개만 표시
  }, [items]);

  const isAllChecked =
    items.length > 0 && selectedItems.length === items.length;

  return (
    <MainLayout>
      <MainContent className="overflow-visible">
        <TwoPanelLayout
          leftPanel={
            <Card>
              <CardContent className="flex items-center justify-between">
                <div className="flex gap-4 items-center">
                  <Checkbox
                    checked={isAllChecked}
                    onCheckedChange={handleSelectAll}
                  />
                  <Label className="text-md">전체 선택</Label>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleRemoveSelected}
                    variant="outline"
                    type="button"
                    size="sm"
                  >
                    삭제
                  </Button>
                </div>
              </CardContent>
              <Separator />

              {/* 장바구니 아이템 목록 */}
              {items.length === 0 ? (
                <Empty
                  title="장바구니가 비어있습니다."
                  description="쇼핑을 계속해보세요!"
                />
              ) : (
                <div className="space-y-0">
                  {items.map((item, index) => (
                    <React.Fragment key={item.id}>
                      <div className="flex gap-3 p-4">
                        <Checkbox
                          checked={selectedItems.includes(item.id)}
                          onCheckedChange={(checked) =>
                            handleSelectItem(item.id, checked as boolean)
                          }
                        />
                        <div className="flex-1">
                          {item.type === "product" ? (
                            <CartItemCard
                              item={item}
                              onRemove={() => {
                                confirm(
                                  "상품을 삭제하시겠습니까?",
                                  () => removeFromCart(item.id),
                                  {
                                    confirmText: "삭제",
                                    cancelText: "취소",
                                  }
                                );
                              }}
                              onChangeOption={() => handleChangeOption(item.id)}
                              onChangeCoupon={() => handleChangeCoupon(item.id)}
                            />
                          ) : (
                            <ReformCartItemCard
                              item={item}
                              onRemove={() => {
                                confirm(
                                  "수선 요청을 삭제하시겠습니까?",
                                  () => removeFromCart(item.id),
                                  {
                                    confirmText: "삭제",
                                    cancelText: "취소",
                                  }
                                );
                              }}
                              onChangeOption={() => handleChangeReformOption(item.id)}
                              onChangeCoupon={() => handleChangeCoupon(item.id)}
                            />
                          )}
                        </div>
                      </div>
                      {index < items.length - 1 && <Separator />}
                    </React.Fragment>
                  ))}
                </div>
              )}
            </Card>
          }
          detail={
            <div>
              {/* 추천 상품 섹션 */}
              {similarProducts.length > 0 && (
                <Card className="bg-zinc-100">
                  <CardHeader>
                    <CardTitle>추천 상품</CardTitle>
                    <CardDescription>
                      이 상품과 함께 보면 좋은 추천 상품들을 확인해보세요
                    </CardDescription>
                  </CardHeader>

                  <CardContent>
                    <div className="grid grid-cols-3 md:grid-cols-4">
                      {similarProducts.map((similarProduct) => (
                        <ProductCard
                          key={similarProduct.id}
                          product={similarProduct}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          }
          rightPanel={
            <Card>
              <CardHeader>
                <CardTitle>주문 금액</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-600">상품 금액</span>
                    <span>{selectedTotals.originalPrice.toLocaleString()}원</span>
                  </div>
                  {selectedTotals.totalDiscount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-600">할인 금액</span>
                      <span className="text-red-500">
                        -{selectedTotals.totalDiscount.toLocaleString()}원
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-600">배송비</span>
                    <span>무료</span>
                  </div>

                  <Separator />

                  <div className="flex justify-between text-base font-bold">
                    <span>총 {selectedTotals.totalQuantity}개</span>
                    <span className="text-lg">
                      {selectedTotals.totalPrice.toLocaleString()}원
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          }
          button={
            <Button
              type="button"
              onClick={handleOrder}
              size="xl"
              className="w-full"
              disabled={selectedItems.length === 0}
            >
              주문하기
            </Button>
          }
        />
      </MainContent>
    </MainLayout>
  );
};

export default CartPage;
