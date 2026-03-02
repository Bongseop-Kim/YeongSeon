import { useState } from "react";
import { Button, Space, Table, Tag } from "antd";
import type { AdminIssuedCouponRow } from "../types/admin-coupon";
import { isActiveIssuedStatus } from "../types/admin-coupon";

type IssuedCouponTableProps = {
  rows: AdminIssuedCouponRow[];
  revoking: boolean;
  onRevoke: (rows: AdminIssuedCouponRow[]) => void;
  onOpenIssueModal: () => void;
};

export function IssuedCouponTable({
  rows,
  revoking,
  onRevoke,
  onOpenIssueModal,
}: IssuedCouponTableProps) {
  const [selectedIssuedIds, setSelectedIssuedIds] = useState<React.Key[]>([]);
  const [selectedIssuedRows, setSelectedIssuedRows] = useState<AdminIssuedCouponRow[]>([]);

  const handleBulkRevoke = () => {
    onRevoke(selectedIssuedRows);
    setSelectedIssuedIds([]);
    setSelectedIssuedRows([]);
  };

  return (
    <>
      <Space size={12} style={{ marginTop: 16, marginBottom: 16 }}>
        <Button type="primary" onClick={onOpenIssueModal}>
          쿠폰 발급
        </Button>
        <Button
          danger
          disabled={!selectedIssuedIds.length}
          loading={revoking}
          onClick={handleBulkRevoke}
        >
          일괄 회수 ({selectedIssuedIds.length}건)
        </Button>
      </Space>

      <Table<AdminIssuedCouponRow>
        dataSource={rows}
        rowKey="id"
        pagination={false}
        size="small"
        title={() => `발급 내역 (${rows.length}건)`}
        rowSelection={{
          selectedRowKeys: selectedIssuedIds,
          onChange: (keys, selectedRows) => {
            setSelectedIssuedIds(keys);
            setSelectedIssuedRows(selectedRows);
          },
          getCheckboxProps: (record) => ({
            disabled: !isActiveIssuedStatus(record.status),
          }),
        }}
      >
        <Table.Column dataIndex="userName" title="이름" />
        <Table.Column dataIndex="userEmail" title="이메일" />
        <Table.Column
          dataIndex="status"
          title="상태"
          render={(v: string | null) => v != null ? <Tag>{v}</Tag> : null}
        />
        <Table.Column dataIndex="issuedAt" title="발급일" />
        <Table.Column
          title="회수"
          render={(_: unknown, record: AdminIssuedCouponRow) => (
            <Button
              size="small"
              danger
              disabled={!isActiveIssuedStatus(record.status)}
              loading={revoking}
              onClick={() => onRevoke([record])}
            >
              회수
            </Button>
          )}
        />
      </Table>
    </>
  );
}
