import type { RefObject, ReactNode } from "react";
import { cn } from "@/shared/lib/utils";
import PaymentWidget, {
  type PaymentWidgetRef,
} from "@/shared/composite/payment-widget";

interface PaymentWidgetAsideProps {
  paymentWidgetRef: RefObject<PaymentWidgetRef | null>;
  amount: number | null;
  customerKey: string;
  title?: string;
  description?: string;
  priceFallback?: ReactNode;
  className?: string;
}

export function PaymentWidgetAside({
  paymentWidgetRef,
  amount,
  customerKey,
  title = "결제 수단",
  description,
  priceFallback,
  className,
}: PaymentWidgetAsideProps) {
  return (
    <section className={cn(className)}>
      <h3 className="text-sm font-semibold text-zinc-950">{title}</h3>
      {description && (
        <p className="mt-1 text-sm leading-6 text-zinc-500">{description}</p>
      )}
      <div className="mt-3">
        {amount !== null ? (
          <PaymentWidget
            ref={paymentWidgetRef}
            amount={amount}
            customerKey={customerKey}
          />
        ) : (
          (priceFallback ?? null)
        )}
      </div>
    </section>
  );
}
