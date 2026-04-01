import {
  CLAIM_STATUS_COLORS,
  CLAIM_TYPE_LABELS,
  ORDER_STATUS_COLORS,
} from "@yeongseon/shared";
import { Table, Tag } from "antd";
import type { AdminOrderHistoryEntry } from "@/features/orders/types/admin-order";

interface StatusLogTableProps {
  logs: AdminOrderHistoryEntry[];
}

function renderDate(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("ko-KR");
}

function getStatusColor(log: AdminOrderHistoryEntry, status: string) {
  return log.kind === "claim"
    ? CLAIM_STATUS_COLORS[status]
    : ORDER_STATUS_COLORS[status];
}

export function StatusLogTable({ logs }: StatusLogTableProps) {
  return (
    <Table
      dataSource={logs}
      rowKey={(record) => `${record.kind}:${record.id}`}
      pagination={false}
      style={{ marginBottom: 24 }}
    >
      <Table.Column dataIndex="createdAt" title="일시" render={renderDate} />
      <Table.Column
        dataIndex="kind"
        title="이력 종류"
        render={(value: AdminOrderHistoryEntry["kind"]) => (
          <Tag color={value === "claim" ? "gold" : "blue"}>
            {value === "claim" ? "클레임" : "주문"}
          </Tag>
        )}
      />
      <Table.Column<AdminOrderHistoryEntry>
        title="클레임 정보"
        render={(_, record) =>
          record.kind === "claim" ? (
            <>
              <Tag color="purple">{CLAIM_TYPE_LABELS[record.claimType]}</Tag>
              {record.claimNumber}
            </>
          ) : (
            "-"
          )
        }
      />
      <Table.Column<AdminOrderHistoryEntry>
        dataIndex="previousStatus"
        title="이전 상태"
        render={(value: string, record) => (
          <Tag color={getStatusColor(record, value)}>{value}</Tag>
        )}
      />
      <Table.Column<AdminOrderHistoryEntry>
        dataIndex="newStatus"
        title="변경 상태"
        render={(value: string, record) => (
          <Tag color={getStatusColor(record, value)}>{value}</Tag>
        )}
      />
      <Table.Column
        dataIndex="changedBy"
        title="변경자"
        render={(value: string | null | undefined) => value ?? "-"}
      />
      <Table.Column
        dataIndex="memo"
        title="메모"
        render={(value: string | null) => value ?? "-"}
      />
      <Table.Column
        dataIndex="isRollback"
        title="구분"
        render={(value: boolean) =>
          value ? <Tag color="red">롤백</Tag> : <Tag color="default">정상</Tag>
        }
      />
    </Table>
  );
}
