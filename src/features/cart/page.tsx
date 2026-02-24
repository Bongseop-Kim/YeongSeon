import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import TwoPanelLayout from "@/components/layout/two-panel-layout";
import { useModalStore } from "@/store/modal";
import { MainContent, MainLayout } from "@/components/layout/main-layout";
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/features/cart/hooks/useCart";
import { useOrderStore } from "@/store/order";
import {
  OptionChangeModal,
  type OptionChangeModalRef,
} from "./components/option-change-modal";
import {
  ReformOptionChangeModal,
  type ReformOptionChangeModalRef,
} from "./components/reform-option-change-modal";
import { useCouponSelect } from "@/features/order/order-form/hook/useCouponSelect";
import { PRODUCTS_DATA } from "@/features/shop/constants/PRODUCTS_DATA";
import { calculateOrderSummary } from "@/features/order/utils/calculated-order-totals";
import { useBreakpoint } from "@/providers/breakpoint-provider";
import { ROUTES } from "@/constants/ROUTES";
import { toast } from "sonner";
import { CartSelectionToolbar } from "@/features/cart/components/cart-selection-toolbar";
import { CartItemsPanel } from "@/features/cart/components/cart-items-panel";
import { CartRecommendationsCard } from "@/features/cart/components/cart-recommendations-card";
import { CartOrderSummaryCard } from "@/features/cart/components/cart-order-summary-card";
import {
  getRecommendedProducts,
  getSelectedCartItems,
} from "@/features/cart/utils/cart-page";

const CartPage = () => {
  const { openModal, confirm } = useModalStore();
  const navigate = useNavigate();

  const {
    items,
    removeFromCart,
    updateQuantity,
    updateProductOption,
    updateReformOption,
    applyCoupon,
  } = useCart();
  const { setOrderItems } = useOrderStore();
  const { isMobile } = useBreakpoint();
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const { openCouponSelect } = useCouponSelect();

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

    confirm("선택한 상품을 삭제하시겠습니까?", async () => {
      await Promise.all(selectedItems.map((itemId) => removeFromCart(itemId)));
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
      onConfirm: async () => {
        if (!modalRef.current) return;

        const { quantity, optionId } = modalRef.current.getValues();

        // 옵션이나 수량이 변경되었는지 확인
        const hasChanges =
          quantity !== item.quantity || optionId !== item.selectedOption?.id;

        if (!hasChanges) {
          confirm("변경 사항이 없습니다.");
          return;
        }

        const newOption = optionId
          ? item.product.options?.find((opt) => opt.id === optionId)
          : undefined;

        // 옵션이 변경되지 않고 수량만 변경된 경우
        if (optionId === item.selectedOption?.id) {
          await updateQuantity(itemId, quantity);
          return;
        }

        // 옵션이 변경된 경우: 원자적으로 기존 아이템을 제거하고 새 옵션으로 교체
        await updateProductOption(itemId, newOption, quantity);
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
      onConfirm: async () => {
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
        await updateReformOption(itemId, updatedTie);
        toast.success("수선 옵션이 변경되었습니다.");
      },
    });
  };

  const handleChangeCoupon = async (itemId: string) => {
    try {
      const item = items.find((i) => i.id === itemId);
      if (!item) return;

      const selectedCoupon = await openCouponSelect(item.appliedCoupon?.id);

      // 취소된 경우 (null 반환) 처리하지 않음
      // 쿠폰을 명시적으로 제거하려면 모달에서 "쿠폰 없음"을 선택하고 확인해야 함
      if (selectedCoupon === null) {
        return;
      }
      // 쿠폰 적용 (null이면 쿠폰 제거)
      await applyCoupon(itemId, selectedCoupon ?? undefined);

      // 성공 메시지 표시
      confirm(
        selectedCoupon
          ? `${selectedCoupon.coupon.name}이(가) 적용되었습니다.`
          : "쿠폰 사용을 취소했습니다."
      );
    } catch (error) {
      console.error(error);
      confirm("쿠폰 변경에 실패했습니다.");
    }
  };

  const handleOrder = () => {
    if (selectedItems.length === 0) {
      confirm("주문할 상품을 선택해주세요.");
      return;
    }

    const selectedCartItems = getSelectedCartItems(items, selectedItems);

    // 선택된 상품들을 주문 store에 저장
    setOrderItems(selectedCartItems);

    // 주문 페이지로 이동
    navigate(ROUTES.ORDER_FORM);
  };

  // 선택된 상품의 총액 계산
  const selectedTotals = useMemo(() => {
    const selectedCartItems = getSelectedCartItems(items, selectedItems);
    return calculateOrderSummary(selectedCartItems);
  }, [items, selectedItems]);

  // 장바구니 상품 기반 추천 상품 찾기
  const similarProducts = useMemo(() => {
    return getRecommendedProducts(items, PRODUCTS_DATA, isMobile ? 6 : 8);
  }, [items, isMobile]);

  const isAllChecked =
    items.length > 0 && selectedItems.length === items.length;

  return (
    <MainLayout>
      <MainContent className="overflow-visible">
        <TwoPanelLayout
          leftPanel={
            <Card>
              <CartSelectionToolbar
                isAllChecked={isAllChecked}
                onToggleAll={handleSelectAll}
                onRemoveSelected={handleRemoveSelected}
              />
              <Separator />
              <CartItemsPanel
                items={items}
                selectedItems={selectedItems}
                onSelectItem={handleSelectItem}
                onRemoveProductItem={(itemId) => {
                  confirm("상품을 삭제하시겠습니까?", () => removeFromCart(itemId), {
                    confirmText: "삭제",
                    cancelText: "취소",
                  });
                }}
                onRemoveReformItem={(itemId) => {
                  confirm(
                    "수선 요청을 삭제하시겠습니까?",
                    () => removeFromCart(itemId),
                    {
                      confirmText: "삭제",
                      cancelText: "취소",
                    },
                  );
                }}
                onChangeProductOption={handleChangeOption}
                onChangeReformOption={handleChangeReformOption}
                onChangeCoupon={handleChangeCoupon}
              />
            </Card>
          }
          detail={
            <div>
              <CartRecommendationsCard
                products={similarProducts}
                isMobile={isMobile}
              />
            </div>
          }
          rightPanel={<CartOrderSummaryCard summary={selectedTotals} />}
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
