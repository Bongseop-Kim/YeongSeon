import { Table, Tag } from "antd";
import { ORDER_STATUS_COLORS } from "@yeongseon/shared";
import type { AdminStatusLogEntry } from "@/features/orders/types/admin-order";

interface StatusLogTableProps {
  logs: AdminStatusLogEntry[];
}

export function StatusLogTable({ logs }: StatusLogTableProps) {
  return (
    <Table
      dataSource={logs}
      rowKey="id"
      pagination={false}
      style={{ marginBottom: 24 }}
    >
      <Table.Column
        dataIndex="createdAt"
        title="일시"
        render={(v: string) => (v ? new Date(v).toLocaleString("ko-KR") : "-")}
      />
      <Table.Column
        dataIndex="previousStatus"
        title="이전 상태"
        render={(v: string) => <Tag color={ORDER_STATUS_COLORS[v]}>{v}</Tag>}
      />
      <Table.Column
        dataIndex="newStatus"
        title="변경 상태"
        render={(v: string) => <Tag color={ORDER_STATUS_COLORS[v]}>{v}</Tag>}
      />
      <Table.Column
        dataIndex="changedBy"
        title="변경자"
        render={(v: string | null) => v ?? "-"}
      />
      <Table.Column
        dataIndex="memo"
        title="메모"
        render={(v: string | null) => v ?? "-"}
      />
      <Table.Column
        dataIndex="isRollback"
        title="구분"
        render={(v: boolean) => (v ? <Tag color="red">롤백</Tag> : null)}
      />
    </Table>
  );
}
