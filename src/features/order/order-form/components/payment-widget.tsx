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
    const [ready, setReady] = useState(false);

    useEffect(() => {
      let cancelled = false;

      const init = async () => {
        const tossPayments = await loadTossPayments(CLIENT_KEY);
        if (cancelled) return;

        const widgets = tossPayments.widgets({ customerKey });
        widgetsRef.current = widgets;

        await widgets.setAmount({ currency: "KRW", value: amount });
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
      };

      init();

      return () => {
        cancelled = true;
      };
    }, [customerKey]);

    // 금액 변경 시 업데이트
    useEffect(() => {
      if (widgetsRef.current && ready) {
        widgetsRef.current.setAmount({ currency: "KRW", value: amount });
      }
    }, [amount, ready]);

    useImperativeHandle(ref, () => ({
      requestPayment: async (params) => {
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
