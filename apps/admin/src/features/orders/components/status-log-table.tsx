import { ORDER_STATUS_COLORS } from "@yeongseon/shared";
import type { AdminStatusLogEntry } from "@/features/orders/types/admin-order";
import { StatusLogTable as CommonStatusLogTable } from "@/components/StatusLogTable";

interface StatusLogTableProps {
  logs: AdminStatusLogEntry[];
}

export function StatusLogTable({ logs }: StatusLogTableProps) {
  return (
    <CommonStatusLogTable
      logs={logs}
      statusColors={ORDER_STATUS_COLORS}
      showChangedBy
    />
  );
}
