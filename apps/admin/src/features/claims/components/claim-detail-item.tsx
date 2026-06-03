import { Text } from "seed-design/ui/text";
import type { ReactNode } from "react";

interface ClaimDetailItemProps {
  label: string;
  value: ReactNode;
}

export function ClaimDetailItem({ label, value }: ClaimDetailItemProps) {
  return (
    <div className="claimDetailItem">
      <Text as="dt" textStyle="t4Medium" className="claimDetailLabel">
        {label}
      </Text>
      <Text as="dd" textStyle="t4Regular">
        {value}
      </Text>
    </div>
  );
}
