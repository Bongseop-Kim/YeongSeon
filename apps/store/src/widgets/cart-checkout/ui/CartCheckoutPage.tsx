import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/shared/ui-extended/button";
import {
  CartEditDialog,
  useCart,
  OptionChangeModal,
  type OptionChangeModalRef,
  ReformOptionChangeModal,
  type ReformOptionChangeModalRef,
  CartSelectionToolbar,
  CartItemsPanel,
  CartRecommendationsCard,
  CartOrderSummaryCard,
} from "@/features/cart";
import { PageLayout } from "@/shared/layout/page-layout";
import { useModalStore } from "@/shared/store/modal";
import { MainContent, MainLayout } from "@/shared/layout/main-layout";
import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useOrderStore } from "@/shared/store/order";
import type {
  ProductCartItem,
  ReformCartItem,
} from "@yeongseon/shared/types/view/cart";
import { useCouponSelect } from "@/features/coupon";
import { useProducts } from "@/entities/shop";
import { calculateOrderSummary } from "@yeongseon/shared/utils/calculated-order-totals";
import { useReformPricing } from "@/entities/reform";
import { useBreakpoint } from "@/shared/lib/breakpoint-provider";
import { ROUTES } from "@/shared/constants/ROUTES";
import { toast } from "sonner";
import { UtilityPageIntro } from "@/shared/composite/utility-page";
import { cartKeys, removeCartItemsByIds } from "@/entities/cart";
import { useAuthStore } from "@/shared/store/auth";

export function CartCheckoutPage() {
  const { confirm } = useModalStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    items,
    removeFromCart,
    updateQuantity,
    updateProductOption,
    updateReformOption,
    applyCoupon,
  } = useCart();
  const { setOrderItems } = useOrderStore();
  const userId = useAuthStore((state) => state.user?.id);
  const { isMobile } = useBreakpoint();
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const { openCouponSelect, dialog: couponDialog } = useCouponSelect();

  const optionChangeRef = useRef<OptionChangeModalRef | null>(null);
  const reformOptionChangeRef = useRef<ReformOptionChangeModalRef | null>(null);
  const [optionDialogItemId, setOptionDialogItemId] = useState<string | null>(
    null,
  );
  const [reformDialogItemId, setReformDialogItemId] = useState<string | null>(
    null,
  );
  const [isOptionSubmitting, setIsOptionSubmitting] = useState(false);
  const [isReformSubmitting, setIsReformSubmitting] = useState(false);

  const {
    data: similarProducts = [],
    isLoading: similarLoading,
    isError: similarError,
    refetch: refetchSimilar,
  } = useProducts({ sortOption: "popular", limit: 8 });
  const { data: reformPricing } = useReformPricing();

  useEffect(() => {
    const currentIds = new Set(items.map((item) => item.id));
    setSelectedItems((prev) => prev.filter((id) => currentIds.has(id)));
  }, [items]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(items.map((item) => item.id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectItem = (itemId: string, checked: boolean) => {
    setSelectedItems((prev) => {
      if (checked) {
        return prev.includes(itemId) ? prev : [...prev, itemId];
      } else {
        return prev.filter((id) => id !== itemId);
      }
    });
  };

  const handleRemoveSelected = () => {
    if (selectedItems.length === 0) {
      confirm("삭제할 상품을 선택해주세요.");
      return;
    }

    confirm("선택한 상품을 삭제하시겠습니까?", () => {
      void (async () => {
        try {
          if (userId) {
            await removeCartItemsByIds(userId, selectedItems);
            await queryClient.invalidateQueries({
              queryKey: cartKeys.items(userId),
            });
          } else {
            await Promise.all(
              selectedItems.map((itemId) => removeFromCart(itemId)),
            );
          }
          setSelectedItems([]);
        } catch (error) {
          console.error(error);
        }
      })();
    });
  };

  const confirmAndRemove = (itemId: string, message: string) => {
    confirm(
      message,
      () => {
        void (async () => {
          try {
            await removeFromCart(itemId);
          } catch (error) {
            console.error(error);
          }
        })();
      },
      {
        confirmText: "삭제",
        cancelText: "취소",
      },
    );
  };

  const handleChangeOption = (itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    if (!item || item.type !== "product") return;
    setOptionDialogItemId(itemId);
  };

  const handleConfirmOptionChange = async () => {
    if (isOptionSubmitting) return;

    const item = optionDialogItem;
    if (!item || !optionChangeRef.current) return;

    const { quantity, optionId } = optionChangeRef.current.getValues();
    const hasChanges =
      quantity !== item.quantity || optionId !== item.selectedOption?.id;

    if (!hasChanges) {
      toast.warning("변경 사항이 없습니다.");
      setOptionDialogItemId(null);
      return;
    }

    const newOption = optionId
      ? item.product.options?.find((opt) => opt.id === optionId)
      : undefined;

    if (optionId && !newOption) {
      toast.error("선택한 옵션을 찾을 수 없습니다.");
      console.error("Cart option mismatch", {
        itemId: item.id,
        optionId,
        availableOptionIds: item.product.options?.map((opt) => opt.id) ?? [],
      });
      return;
    }

    try {
      setIsOptionSubmitting(true);
      if (optionId === item.selectedOption?.id) {
        await updateQuantity(item.id, quantity);
        toast.success("수량이 변경되었습니다.");
      } else {
        await updateProductOption(item.id, newOption, quantity);
        toast.success("옵션이 변경되었습니다.");
      }
      setOptionDialogItemId(null);
    } catch (error) {
      toast.error("변경에 실패했습니다.");
      console.error(error);
    } finally {
      setIsOptionSubmitting(false);
    }
  };

  const handleChangeReformOption = (itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    if (!item || item.type !== "reform") return;
    setReformDialogItemId(itemId);
  };

  const handleConfirmReformOptionChange = async () => {
    if (isReformSubmitting) return;

    const item = reformDialogItem;
    if (!item || !reformOptionChangeRef.current) return;

    const updatedTie = reformOptionChangeRef.current.getValues();
    const hasChanges =
      updatedTie.hasLengthReform !== item.reformData.tie.hasLengthReform ||
      updatedTie.hasWidthReform !== item.reformData.tie.hasWidthReform ||
      updatedTie.measurementType !== item.reformData.tie.measurementType ||
      updatedTie.tieLength !== item.reformData.tie.tieLength ||
      updatedTie.wearerHeight !== item.reformData.tie.wearerHeight ||
      updatedTie.targetWidth !== item.reformData.tie.targetWidth;

    if (!hasChanges) {
      toast.warning("변경 사항이 없습니다.");
      setReformDialogItemId(null);
      return;
    }

    try {
      setIsReformSubmitting(true);
      if (!reformPricing) {
        toast.error("수선 비용 정보를 불러오지 못했습니다.");
        return;
      }
      await updateReformOption(item.id, updatedTie);
      toast.success("수선 옵션이 변경되었습니다.");
      setReformDialogItemId(null);
    } catch (error) {
      toast.error("수선 옵션 변경에 실패했습니다.");
      console.error(error);
    } finally {
      setIsReformSubmitting(false);
    }
  };

  const handleChangeCoupon = async (itemId: string) => {
    try {
      const item = items.find((i) => i.id === itemId);
      if (!item) return;

      const selectedCoupon = await openCouponSelect(item.appliedCoupon?.id);

      if (selectedCoupon === null) {
        return;
      }

      await applyCoupon(itemId, selectedCoupon);

      toast.success(
        selectedCoupon
          ? `${selectedCoupon.coupon.name}이(가) 적용되었습니다.`
          : "쿠폰 사용을 취소했습니다.",
      );
    } catch (error) {
      console.error(error);
      toast.error("쿠폰 변경에 실패했습니다.");
    }
  };

  const selectedCartItems = useMemo(
    () => items.filter((item) => selectedItems.includes(item.id)),
    [items, selectedItems],
  );

  const handleOrder = () => {
    if (selectedCartItems.length === 0) {
      confirm("주문할 상품을 선택해주세요.");
      return;
    }

    setOrderItems(selectedCartItems);
    navigate(ROUTES.ORDER_FORM);
  };

  const selectedTotals = useMemo(() => {
    const hasReformItems = selectedCartItems.some(
      (item) => item.type === "reform",
    );
    const shippingCost = hasReformItems
      ? (reformPricing?.shippingCost ?? 0)
      : 0;
    return calculateOrderSummary(selectedCartItems, shippingCost);
  }, [selectedCartItems, reformPricing]);

  const isAllChecked =
    items.length > 0 && selectedItems.length === items.length;

  const optionDialogItem = optionDialogItemId
    ? ((items.find(
        (i) => i.id === optionDialogItemId && i.type === "product",
      ) as ProductCartItem | undefined) ?? null)
    : null;

  const reformDialogItem = reformDialogItemId
    ? ((items.find(
        (i) => i.id === reformDialogItemId && i.type === "reform",
      ) as ReformCartItem | undefined) ?? null)
    : null;

  return (
    <>
      <MainLayout>
        <MainContent className="overflow-visible">
          <PageLayout
            detail={
              <CartRecommendationsCard
                products={similarProducts}
                isMobile={isMobile}
                isLoading={similarLoading}
                isError={similarError}
                onRetry={refetchSimilar}
              />
            }
            sidebar={<CartOrderSummaryCard summary={selectedTotals} />}
            actionBar={
              <Button
                type="button"
                onClick={handleOrder}
                size="xl"
                className="w-full"
                data-testid="cart-order-button"
                disabled={selectedItems.length === 0}
              >
                {selectedItems.length > 0
                  ? `${selectedTotals.totalPrice.toLocaleString()}원 주문하기`
                  : "주문하기"}
              </Button>
            }
          >
            <UtilityPageIntro
              eyebrow="Cart"
              title="장바구니"
              description="지금 주문할 상품을 고르고 옵션과 쿠폰을 정리합니다."
            />

            <CartSelectionToolbar
              isAllChecked={isAllChecked}
              onToggleAll={handleSelectAll}
              onRemoveSelected={handleRemoveSelected}
            />
            <CartItemsPanel
              items={items}
              selectedItems={selectedItems}
              onSelectItem={handleSelectItem}
              onRemoveProductItem={(itemId) =>
                confirmAndRemove(itemId, "상품을 삭제하시겠습니까?")
              }
              onRemoveReformItem={(itemId) =>
                confirmAndRemove(itemId, "수선 요청을 삭제하시겠습니까?")
              }
              onChangeProductOption={handleChangeOption}
              onChangeReformOption={handleChangeReformOption}
              onChangeCoupon={handleChangeCoupon}
            />
          </PageLayout>
        </MainContent>
      </MainLayout>

      <CartEditDialog
        open={!!optionDialogItem}
        title="옵션/수량 변경"
        isSubmitting={isOptionSubmitting}
        onClose={() => setOptionDialogItemId(null)}
        onConfirm={() => void handleConfirmOptionChange()}
      >
        {optionDialogItem && (
          <OptionChangeModal ref={optionChangeRef} item={optionDialogItem} />
        )}
      </CartEditDialog>

      <CartEditDialog
        open={!!reformDialogItem}
        title="수선 옵션 변경"
        isSubmitting={isReformSubmitting}
        onClose={() => setReformDialogItemId(null)}
        onConfirm={() => void handleConfirmReformOptionChange()}
      >
        {reformDialogItem && (
          <ReformOptionChangeModal
            ref={reformOptionChangeRef}
            item={reformDialogItem}
          />
        )}
      </CartEditDialog>

      {couponDialog}
    </>
  );
}
