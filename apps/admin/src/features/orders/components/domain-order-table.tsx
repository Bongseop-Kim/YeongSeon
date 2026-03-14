import { useState } from "react";
import { Table } from "antd";
import { Input, Select, Space } from "antd";
import { TagField } from "@refinedev/antd";
import { useNavigation } from "@refinedev/core";
import dayjs from "dayjs";
import { ORDER_STATUS_OPTIONS, ORDER_STATUS_COLORS } from "@yeongseon/shared";
import type { OrderType } from "@yeongseon/shared";
import { useAdminOrderTable } from "../api/orders-query";
import type { AdminOrderListItem } from "../types/admin-order";
import { DateRangeFilter, type DateRange } from "@/components/DateRangeFilter";

interface DomainOrderTableProps {
  orderType: OrderType;
}

export function DomainOrderTable({ orderType }: DomainOrderTableProps) {
  const { show } = useNavigation();
  const defaultRange: DateRange = [
    dayjs().startOf("month"),
    dayjs().endOf("month"),
  ];
  const [dateRange, setDateRange] = useState<DateRange>(defaultRange);

  const { tableProps, setFilters } = useAdminOrderTable(orderType, [
    defaultRange[0].format("YYYY-MM-DD"),
    defaultRange[1].format("YYYY-MM-DD"),
  ]);
  const statusOptions = ORDER_STATUS_OPTIONS[orderType];

  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range);
    setFilters(
      [
        {
          field: "created_at",
          operator: "gte",
          value: range[0].startOf("day").toISOString(),
        },
        {
          field: "created_at",
          operator: "lte",
          value: range[1].endOf("day").toISOString(),
        },
      ],
      "merge",
    );
  };

  return (
    <>
      <Space style={{ marginBottom: 16 }} wrap>
        <Input.Search
          placeholder="주문번호 검색"
          allowClear
          onSearch={(value) => {
            setFilters(
              [
                {
                  field: "orderNumber",
                  operator: "contains",
                  value: value || undefined,
                },
              ],
              "merge",
            );
          }}
          style={{ width: 250 }}
        />
        <Select
          placeholder="상태"
          allowClear
          options={statusOptions}
          onChange={(value) => {
            setFilters(
              [
                {
                  field: "status",
                  operator: "eq",
                  value: value || undefined,
                },
              ],
              "merge",
            );
          }}
          style={{ width: 120 }}
        />
        <DateRangeFilter value={dateRange} onChange={handleDateRangeChange} />
      </Space>

      <Table<AdminOrderListItem>
        {...tableProps}
        rowKey="id"
        onRow={(record) => ({
          onClick: () => show("admin_order_list_view", record.id),
          style: { cursor: "pointer" },
        })}
      >
        {getColumnsForType(orderType)}
      </Table>
    </>
  );
}

function getColumnsForType(orderType: OrderType) {
  const common = [
    <Table.Column key="orderNumber" dataIndex="orderNumber" title="주문번호" />,
    <Table.Column key="date" dataIndex="date" title="주문일" />,
    <Table.Column key="customerName" dataIndex="customerName" title="고객명" />,
  ];

  const tail = [
    <Table.Column
      key="totalPrice"
      dataIndex="totalPrice"
      title="결제금액"
      render={(value: number | null) =>
        value != null ? `${value.toLocaleString()}원` : "-"
      }
    />,
    <Table.Column
      key="status"
      dataIndex="status"
      title="상태"
      render={(value: string) => (
        <TagField
          value={value}
          color={ORDER_STATUS_COLORS[value] ?? "default"}
        />
      )}
    />,
  ];

  if (orderType === "sale") {
    return [
      ...common,
      <Table.Column
        key="customerEmail"
        dataIndex="customerEmail"
        title="이메일"
        render={(value: string | null) => value ?? "-"}
      />,
      ...tail,
    ];
  }

  if (orderType === "custom") {
    return [
      ...common,
      <Table.Column
        key="fabricType"
        dataIndex="fabricType"
        title="원단유형"
        render={(value: string | null) => value ?? "-"}
      />,
      <Table.Column
        key="designType"
        dataIndex="designType"
        title="디자인유형"
        render={(value: string | null) => value ?? "-"}
      />,
      <Table.Column
        key="itemQuantity"
        dataIndex="itemQuantity"
        title="수량"
        render={(value: number | null) => value ?? "-"}
      />,
      ...tail,
    ];
  }

  if (orderType === "token") {
    return [
      ...common,
      <Table.Column
        key="customerEmail"
        dataIndex="customerEmail"
        title="이메일"
        render={(value: string | null) => value ?? "-"}
      />,
      ...tail,
    ];
  }

  // repair
  return [
    ...common,
    <Table.Column
      key="reformSummary"
      dataIndex="reformSummary"
      title="수선요약"
      render={(value: string | null) => value ?? "-"}
    />,
    ...tail,
  ];
}
