import { useEffect, useRef, useImperativeHandle, forwardRef, useState } from "react";
import { loadTossPayments, type TossPaymentsWidgets } from "@tosspayments/tosspayments-sdk";

const CLIENT_KEY = import.meta.env.VITE_TOSS_CLIENT_KEY;

export interface PaymentWidgetRef {
  requestPayment: (params: {
    orderId: string;
    orderName: string;
    successUrl: string;
    failUrl: string;
    customerName?: string;
    customerEmail?: string;
  }) => Promise<void>;
}

interface PaymentWidgetProps {
  amount: number;
  customerKey: string;
}

const PaymentWidget = forwardRef<PaymentWidgetRef, PaymentWidgetProps>(
  ({ amount, customerKey }, ref) => {
    const widgetsRef = useRef<TossPaymentsWidgets | null>(null);
    const paymentMethodRef = useRef<HTMLDivElement>(null);
    const agreementRef = useRef<HTMLDivElement>(null);
    const amountRef = useRef(amount);
    const [ready, setReady] = useState(false);
    const [initError, setInitError] = useState<string | null>(null);

    useEffect(() => {
      let cancelled = false;

      const init = async () => {
        if (!CLIENT_KEY) {
          const message = "VITE_TOSS_CLIENT_KEY가 설정되지 않아 결제위젯을 초기화할 수 없습니다.";
          console.error(`[payment-widget] ${message}`);
          if (!cancelled) {
            setInitError(message);
          }
          return;
        }

        try {
          const tossPayments = await loadTossPayments(CLIENT_KEY);
          if (cancelled) return;

          const widgets = tossPayments.widgets({ customerKey });
          widgetsRef.current = widgets;

          await widgets.setAmount({ currency: "KRW", value: amountRef.current });
          if (cancelled) return;

          await Promise.all([
            widgets.renderPaymentMethods({
              selector: "#payment-method",
            }),
            widgets.renderAgreement({
              selector: "#payment-agreement",
              variantKey: "AGREEMENT",
            }),
          ]);

          if (!cancelled) {
            setReady(true);
          }
        } catch (error) {
          const message = "결제위젯 초기화에 실패했습니다.";
          console.error(`[payment-widget] ${message}`, error);
          if (!cancelled) {
            setInitError(message);
          }
        }
      };

      init();

      return () => {
        cancelled = true;
      };
    }, [customerKey]);

    useEffect(() => {
      amountRef.current = amount;
    }, [amount]);

    // 금액 변경 시 업데이트
    useEffect(() => {
      if (widgetsRef.current && ready) {
        widgetsRef.current.setAmount({ currency: "KRW", value: amount });
      }
    }, [amount, ready]);

    useImperativeHandle(ref, () => ({
      requestPayment: async (params) => {
        if (initError) {
          throw new Error(initError);
        }
        if (!widgetsRef.current) {
          throw new Error("결제위젯이 초기화되지 않았습니다.");
        }
        await widgetsRef.current.requestPayment({
          orderId: params.orderId,
          orderName: params.orderName,
          successUrl: params.successUrl,
          failUrl: params.failUrl,
          customerName: params.customerName,
          customerEmail: params.customerEmail,
        });
      },
    }));

    if (initError) {
      return null;
    }

    return (
      <div>
        <div id="payment-method" ref={paymentMethodRef} />
        <div id="payment-agreement" ref={agreementRef} />
      </div>
    );
  }
);

PaymentWidget.displayName = "PaymentWidget";

export default PaymentWidget;
