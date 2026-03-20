import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ROUTES } from "@/constants/ROUTES";
import { MainContent, MainLayout } from "@/components/layout/main-layout";
import { useConfirmPayment } from "@/features/payment/api/payment-query";
import { useOrderStore } from "@/store/order";
import { removeCartItemsByIds } from "@/features/cart/api/cart-api";
import { toast } from "@/lib/toast";
import { Loader2 } from "lucide-react";
import { useRequiredUser } from "@/hooks/use-required-user";

const PaymentSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { mutateAsync: confirmPaymentMutation } = useConfirmPayment();
  const { items: orderItems, clearOrderItems } = useOrderStore();
  const userId = useRequiredUser();
  const [error, setError] = useState<string | null>(null);
  const processedRef = useRef(false);

  const paymentKey = searchParams.get("paymentKey");
  const orderId = searchParams.get("orderId");
  const amount = searchParams.get("amount");

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    const processPayment = async () => {
      if (!paymentKey || !orderId || !amount) {
        setError("결제 정보가 올바르지 않습니다.");
        return;
      }

      const parsedAmount = Number(amount);
      if (Number.isNaN(parsedAmount)) {
        setError("결제 금액이 올바르지 않습니다.");
        return;
      }

      try {
        // 1. 결제 승인
        const paymentResult = await confirmPaymentMutation({
          paymentKey,
          orderId,
          amount: parsedAmount,
        });

        // 2. 장바구니에서 주문한 아이템 제거 (sample order 등 cart 미사용 주문은 skip)
        if (orderItems.length > 0) {
          try {
            const orderedItemIds = orderItems.map((item) => item.id);
            await removeCartItemsByIds(userId, orderedItemIds);
          } catch (cartErr) {
            // 장바구니 업데이트 실패는 주문 실패로 처리하지 않음
            console.warn("장바구니 아이템 제거 실패:", cartErr);
          }
        }

        // 3. 정리
        const repairOrder = paymentResult.orders.find(
          (order) => order.orderType === "repair",
        );

        const reformItem = repairOrder
          ? orderItems.find((item) => item.type === "reform")
          : undefined;
        const prefilledTracking = repairOrder
          ? reformItem
            ? useOrderStore.getState().getTrackingInfo(reformItem.id)
            : undefined
          : undefined;

        clearOrderItems();

        const sampleCouponResult = paymentResult.orders.find(
          (order) => order.orderType === "sample",
        );
        if (sampleCouponResult?.couponIssued === true) {
          toast.success("결제가 완료되었습니다. 쿠폰이 발급되었습니다.");
        } else if (sampleCouponResult?.couponIssued === false) {
          toast.success("결제가 완료되었습니다. 이미 쿠폰을 보유 중입니다.");
        } else {
          toast.success("결제가 완료되었습니다!");
        }
        if (repairOrder) {
          navigate(`${ROUTES.REPAIR_SHIPPING}/${repairOrder.orderId}`, {
            replace: true,
            state: { prefilledTracking: prefilledTracking ?? null },
          });
        } else if (paymentResult.type === "token_purchase") {
          navigate(ROUTES.TOKEN_PURCHASE_SUCCESS, { replace: true });
        } else if (paymentResult.orders.length === 1) {
          navigate(
            `${ROUTES.ORDER_DETAIL}/${paymentResult.orders[0].orderId}`,
            { replace: true },
          );
        } else {
          navigate(ROUTES.ORDER_LIST, { replace: true });
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "결제 처리 중 오류가 발생했습니다.";
        setError(errorMessage);
      }
    };

    processPayment();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only: 결제 처리는 마운트 시 1회만 실행, deps 추가 시 중복 처리 발생
  }, []);

  if (error) {
    return (
      <MainLayout>
        <MainContent>
          <div className="flex flex-col items-center justify-center min-h-96 space-y-4">
            <p className="text-red-500 text-lg">{error}</p>
            <button
              onClick={() => navigate(ROUTES.ORDER_FORM)}
              className="text-blue-600 underline"
            >
              주문서로 돌아가기
            </button>
          </div>
        </MainContent>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <MainContent>
        <div className="flex flex-col items-center justify-center min-h-96 space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-lg text-zinc-600">결제를 확인하고 있습니다...</p>
        </div>
      </MainContent>
    </MainLayout>
  );
};

export default PaymentSuccessPage;
