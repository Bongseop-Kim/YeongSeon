import type { RefObject, ReactNode } from "react";
import { cn } from "@/shared/lib/utils";
import PaymentWidget, {
  type PaymentWidgetRef,
} from "@/shared/composite/payment-widget";
import { CheckboxInput } from "@/shared/composite/checkbox-input";

interface ConsentProps {
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  description: string;
}

interface PaymentWidgetAsideProps {
  paymentWidgetRef: RefObject<PaymentWidgetRef | null>;
  amount: number | null;
  customerKey: string;
  title?: string;
  description?: string;
  consent?: ConsentProps;
  priceFallback?: ReactNode;
  className?: string;
}

export function PaymentWidgetAside({
  paymentWidgetRef,
  amount,
  customerKey,
  title = "결제 수단",
  description,
  consent,
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
      {consent ? (
        <CheckboxInput
          id={consent.id}
          checked={consent.checked}
          onCheckedChange={consent.onCheckedChange}
          label={consent.label}
          description={consent.description}
          required
          className="pt-4"
        />
      ) : null}
    </section>
  );
}
