import type { RefObject, ReactNode } from "react";
import { UtilityPageAside } from "@/components/composite/utility-page";
import PaymentWidget, {
  type PaymentWidgetRef,
} from "@/components/composite/payment-widget";
import { ConsentCheckbox } from "@/components/composite/consent-checkbox";

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
    <UtilityPageAside
      title={title}
      description={description}
      tone="muted"
      className={className}
    >
      {amount !== null ? (
        <div className="-mx-4 lg:-mx-5">
          <PaymentWidget
            ref={paymentWidgetRef}
            amount={amount}
            customerKey={customerKey}
          />
        </div>
      ) : (
        (priceFallback ?? null)
      )}
      {consent ? (
        <ConsentCheckbox
          id={consent.id}
          checked={consent.checked}
          onCheckedChange={consent.onCheckedChange}
          label={consent.label}
          description={consent.description}
          required
          className="pt-4"
        />
      ) : null}
    </UtilityPageAside>
  );
}
