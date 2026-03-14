import { Table, Tag } from "antd";
import { CLAIM_STATUS_COLORS } from "@yeongseon/shared";
import type { AdminClaimStatusLogEntry } from "../types/admin-claim";

interface ClaimStatusLogTableProps {
  logs: AdminClaimStatusLogEntry[];
}

export function ClaimStatusLogTable({ logs }: ClaimStatusLogTableProps) {
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
        render={(v: string) => {
          if (!v) return "-";
          const d = new Date(v);
          return isNaN(d.getTime()) ? "-" : d.toLocaleString("ko-KR");
        }}
      />
      <Table.Column
        dataIndex="previousStatus"
        title="이전 상태"
        render={(v: string) => <Tag color={CLAIM_STATUS_COLORS[v]}>{v}</Tag>}
      />
      <Table.Column
        dataIndex="newStatus"
        title="변경 상태"
        render={(v: string) => <Tag color={CLAIM_STATUS_COLORS[v]}>{v}</Tag>}
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
