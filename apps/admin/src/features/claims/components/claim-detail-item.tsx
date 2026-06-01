import type { ReactNode } from "react";

interface ClaimDetailItemProps {
  label: string;
  value: ReactNode;
}

export function ClaimDetailItem({ label, value }: ClaimDetailItemProps) {
  return (
    <div className="claimDetailItem">
      <dt className="claimDetailLabel">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
