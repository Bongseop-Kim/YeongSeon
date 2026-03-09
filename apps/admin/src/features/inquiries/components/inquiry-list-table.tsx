import { Table, Tag, Select, Space } from "antd";
import { useNavigation } from "@refinedev/core";
import {
  INQUIRY_STATUS_COLORS,
  INQUIRY_STATUS_OPTIONS,
} from "../types/admin-inquiry";
import { useAdminInquiryTable } from "../api/inquiries-query";
import type { AdminInquiryListItem } from "../types/admin-inquiry";

export function InquiryListTable() {
  const { show } = useNavigation();
  const { tableProps, setFilters } = useAdminInquiryTable();

  return (
    <>
      <Space style={{ marginBottom: 16 }}>
        <Select
          placeholder="상태"
          allowClear
          options={INQUIRY_STATUS_OPTIONS}
          onChange={(value) => {
            setFilters([
              { field: "status", operator: "eq", value: value || undefined },
            ]);
          }}
          style={{ width: 120 }}
        />
      </Space>

      <Table
        {...tableProps}
        rowKey="id"
        onRow={(record: AdminInquiryListItem) => ({
          onClick: () => show("inquiries", record.id),
          style: { cursor: "pointer" },
        })}
      >
        <Table.Column dataIndex="title" title="제목" />
        <Table.Column dataIndex="category" title="유형" />
        <Table.Column
          dataIndex="status"
          title="상태"
          render={(v: AdminInquiryListItem["status"]) => <Tag color={INQUIRY_STATUS_COLORS[v]}>{v}</Tag>}
        />
        <Table.Column dataIndex="date" title="작성일" />
      </Table>
    </>
  );
}
