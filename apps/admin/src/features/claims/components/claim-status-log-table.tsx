import { CLAIM_STATUS_COLORS } from "@yeongseon/shared";
import type { AdminClaimStatusLogEntry } from "@/features/claims/types/admin-claim";
import { StatusLogTable as CommonStatusLogTable } from "@/components/StatusLogTable";

interface ClaimStatusLogTableProps {
  logs: AdminClaimStatusLogEntry[];
}

export function ClaimStatusLogTable({ logs }: ClaimStatusLogTableProps) {
  return (
    <CommonStatusLogTable logs={logs} statusColors={CLAIM_STATUS_COLORS} />
  );
}
