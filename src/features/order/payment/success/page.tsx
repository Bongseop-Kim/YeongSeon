import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ROUTES } from "@/constants/ROUTES";
import { MainContent, MainLayout } from "@/components/layout/main-layout";
import { confirmPayment } from "@/features/order/api/payment-api";
import { createOrder } from "@/features/order/api/order-api";
import { useOrderStore } from "@/store/order";
import { useCartItems, useSetCartItems, cartKeys } from "@/features/cart/api/cart-query";
import { useAuthStore } from "@/store/auth";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { Loader2 } from "lucide-react";

const PaymentSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { items: orderItems, clearOrderItems } = useOrderStore();
  const { data: cartItems = [] } = useCartItems();
  const setCartItems = useSetCartItems();
  const { user } = useAuthStore();
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

      if (orderItems.length === 0) {
        setError("주문 데이터를 찾을 수 없습니다.");
        return;
      }

      const shippingAddressId = sessionStorage.getItem(
        "payment_shipping_address_id"
      );
      if (!shippingAddressId) {
        setError("배송지 정보를 찾을 수 없습니다.");
        return;
      }

      try {
        // 1. 결제 승인
        await confirmPayment({
          paymentKey,
          orderId,
          amount: Number(amount),
        });

        // 2. 주문 생성
        const result = await createOrder({
          items: orderItems,
          shippingAddressId,
        });

        // 3. 장바구니에서 주문한 아이템 제거
        const orderedItemIds = new Set(orderItems.map((item) => item.id));
        const remainingCartItems = cartItems.filter(
          (cartItem) => !orderedItemIds.has(cartItem.id)
        );

        if (cartItems.length > remainingCartItems.length) {
          try {
            await setCartItems.mutateAsync(remainingCartItems);
            if (user?.id) {
              queryClient.setQueryData(
                cartKeys.items(user.id),
                remainingCartItems
              );
              await queryClient.invalidateQueries({
                queryKey: cartKeys.items(user.id),
              });
            }
          } catch {
            // 장바구니 업데이트 실패는 주문 실패로 처리하지 않음
          }
        }

        // 4. 정리
        clearOrderItems();
        sessionStorage.removeItem("payment_shipping_address_id");

        toast.success("결제가 완료되었습니다!");
        navigate(`${ROUTES.ORDER_DETAIL}/${result.orderId}`, { replace: true });
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "결제 처리 중 오류가 발생했습니다.";
        setError(errorMessage);
      }
    };

    processPayment();
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
          <p className="text-lg text-zinc-600">
            결제를 확인하고 있습니다...
          </p>
        </div>
      </MainContent>
    </MainLayout>
  );
};

export default PaymentSuccessPage;
