import { Table, Tag } from "antd";

interface StatusLogEntryBase {
  id: string;
  previousStatus: string;
  newStatus: string;
  memo: string | null;
  isRollback: boolean;
  createdAt: string;
  changedBy?: string | null;
}

interface StatusLogTableProps<T extends StatusLogEntryBase> {
  logs: T[];
  statusColors: Record<string, string | undefined>;
  showChangedBy?: boolean;
}

function renderDate(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("ko-KR");
}

export function StatusLogTable<T extends StatusLogEntryBase>({
  logs,
  statusColors,
  showChangedBy = false,
}: StatusLogTableProps<T>) {
  return (
    <Table
      dataSource={logs}
      rowKey="id"
      pagination={false}
      style={{ marginBottom: 24 }}
    >
      <Table.Column dataIndex="createdAt" title="일시" render={renderDate} />
      <Table.Column
        dataIndex="previousStatus"
        title="이전 상태"
        render={(value: string) => (
          <Tag color={statusColors[value]}>{value}</Tag>
        )}
      />
      <Table.Column
        dataIndex="newStatus"
        title="변경 상태"
        render={(value: string) => (
          <Tag color={statusColors[value]}>{value}</Tag>
        )}
      />
      {showChangedBy ? (
        <Table.Column
          dataIndex="changedBy"
          title="변경자"
          render={(value: string | null | undefined) => value ?? "-"}
        />
      ) : null}
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
