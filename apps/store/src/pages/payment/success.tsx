import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ROUTES } from "@/shared/constants/ROUTES";
import { MainContent, MainLayout } from "@/shared/layout/main-layout";
import { useConfirmPayment } from "@/entities/payment";
import { useOrderStore } from "@/shared/store/order";
import { removeCartItemsByIds } from "@/entities/cart";
import { toast } from "@/shared/lib/toast";
import { Clock3, Loader2, ReceiptText, Truck } from "lucide-react";
import { useRequiredUser } from "@/shared/hooks/use-required-user";
import { Button } from "@/shared/ui-extended/button";

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
          <div className="mx-auto flex min-h-[28rem] max-w-2xl flex-col justify-center px-4 py-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
              <ReceiptText className="h-7 w-7 text-red-500" />
            </div>
            <h1 className="mt-6 text-3xl font-semibold tracking-tight text-zinc-950">
              결제 확인에 실패했습니다
            </h1>
            <p className="mt-3 text-sm leading-6 text-zinc-600">{error}</p>
            <div className="mt-8 flex justify-center">
              <Button onClick={() => navigate(ROUTES.ORDER_FORM)}>
                주문서로 돌아가기
              </Button>
            </div>
          </div>
        </MainContent>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <MainContent>
        <div className="mx-auto flex min-h-[28rem] max-w-2xl flex-col justify-center px-4 py-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
            <Clock3
              className="h-7 w-7 text-green-600"
              aria-label="Processing payment"
            />
          </div>
          <h1 className="mt-6 text-3xl font-semibold tracking-tight text-zinc-950">
            결제 확인 중입니다
          </h1>
          <p className="mt-3 text-sm leading-6 text-zinc-600">
            주문 정보를 정리한 뒤 다음 화면으로 이동하고 있습니다.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-stone-200 px-4 py-4 text-left">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                Next
              </p>
              <p className="mt-2 text-sm font-medium text-zinc-950">
                주문 상세 또는 후속 화면으로 이동
              </p>
            </div>
            <div className="rounded-2xl border border-stone-200 px-4 py-4 text-left">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                Status
              </p>
              <p className="mt-2 flex items-center gap-2 text-sm font-medium text-zinc-950">
                <Truck className="h-4 w-4 text-zinc-500" />
                결제 승인과 주문 정리를 진행 중입니다
              </p>
            </div>
          </div>
          <div className="mt-8 flex items-center justify-center gap-2 text-sm text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            잠시만 기다려주세요
          </div>
        </div>
      </MainContent>
    </MainLayout>
  );
};

export default PaymentSuccessPage;
