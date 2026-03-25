import { Button } from "@/components/ui-extended/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageLayout } from "@/components/layout/page-layout";
import { useModalStore } from "@/store/modal";
import { MainContent, MainLayout } from "@/components/layout/main-layout";
import { useState, useMemo, useEffect, useRef } from "react";
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
import type {
  ProductCartItem,
  ReformCartItem,
} from "@yeongseon/shared/types/view/cart";
import { useCouponSelect } from "@/features/coupon/hooks/use-coupon-select";
import { useProducts } from "@/features/shop/api/products-query";
import { calculateOrderSummary } from "@yeongseon/shared/utils/calculated-order-totals";
import { useReformPricing } from "@/features/reform/api/reform-query";
import { useBreakpoint } from "@/providers/breakpoint-provider";
import { ROUTES } from "@/constants/ROUTES";
import { toast } from "sonner";
import { CartSelectionToolbar } from "@/features/cart/components/cart-selection-toolbar";
import { CartItemsPanel } from "@/features/cart/components/cart-items-panel";
import { CartRecommendationsCard } from "@/features/cart/components/cart-recommendations-card";
import { CartOrderSummaryCard } from "@/features/cart/components/cart-order-summary-card";

export default function CartPage() {
  const { confirm } = useModalStore();
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
          await Promise.all(
            selectedItems.map((itemId) => removeFromCart(itemId)),
          );
          setSelectedItems([]);
        } catch (error) {
          console.error(error);
        }
      })();
    });
  };

  const handleChangeOption = (itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    if (!item || item.type !== "product") return;
    setOptionDialogItemId(itemId);
  };

  const handleConfirmOptionChange = async () => {
    if (isOptionSubmitting) return;

    const item = items.find((i) => i.id === optionDialogItemId);
    if (!item || item.type !== "product" || !optionChangeRef.current) return;

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

    const item = items.find((i) => i.id === reformDialogItemId);
    if (!item || item.type !== "reform" || !reformOptionChangeRef.current)
      return;

    const updatedTie = reformOptionChangeRef.current.getValues();
    const hasChanges =
      updatedTie.measurementType !== item.reformData.tie.measurementType ||
      updatedTie.tieLength !== item.reformData.tie.tieLength ||
      updatedTie.wearerHeight !== item.reformData.tie.wearerHeight;

    if (!hasChanges) {
      toast.warning("변경 사항이 없습니다.");
      setReformDialogItemId(null);
      return;
    }

    try {
      setIsReformSubmitting(true);
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
                주문하기
              </Button>
            }
          >
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
                  confirm(
                    "상품을 삭제하시겠습니까?",
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
                }}
                onRemoveReformItem={(itemId) => {
                  confirm(
                    "수선 요청을 삭제하시겠습니까?",
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
                }}
                onChangeProductOption={handleChangeOption}
                onChangeReformOption={handleChangeReformOption}
                onChangeCoupon={handleChangeCoupon}
              />
            </Card>
          </PageLayout>
        </MainContent>
      </MainLayout>

      {optionDialogItem && (
        <Dialog
          open
          onOpenChange={(open) =>
            !open && !isOptionSubmitting && setOptionDialogItemId(null)
          }
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>옵션/수량 변경</DialogTitle>
            </DialogHeader>
            <OptionChangeModal ref={optionChangeRef} item={optionDialogItem} />
            <DialogFooter>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setOptionDialogItemId(null)}
                disabled={isOptionSubmitting}
              >
                취소
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  void handleConfirmOptionChange();
                }}
                disabled={isOptionSubmitting}
              >
                {isOptionSubmitting ? "변경 중..." : "변경"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {reformDialogItem && (
        <Dialog
          open
          onOpenChange={(open) =>
            !open && !isReformSubmitting && setReformDialogItemId(null)
          }
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>수선 옵션 변경</DialogTitle>
            </DialogHeader>
            <ReformOptionChangeModal
              ref={reformOptionChangeRef}
              item={reformDialogItem}
            />
            <DialogFooter>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setReformDialogItemId(null)}
                disabled={isReformSubmitting}
              >
                취소
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  void handleConfirmReformOptionChange();
                }}
                disabled={isReformSubmitting}
              >
                {isReformSubmitting ? "변경 중..." : "변경"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {couponDialog}
    </>
  );
}
