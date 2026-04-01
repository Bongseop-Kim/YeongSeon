import { useState } from "react";
import { Table } from "antd";
import { Input, Select, Space } from "antd";
import { TagField } from "@refinedev/antd";
import { useNavigation } from "@refinedev/core";
import dayjs from "dayjs";
import { ORDER_STATUS_OPTIONS, ORDER_STATUS_COLORS } from "@yeongseon/shared";
import type { OrderType } from "@yeongseon/shared";
import { useAdminOrderTable } from "@/features/orders/api/orders-query";
import type { AdminOrderListItem } from "@/features/orders/types/admin-order";
import { DateRangeFilter, type DateRange } from "@/components/DateRangeFilter";
import { formatDateTime } from "@/utils/format-date-time";

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
  const renderNullableValue = (value: string | number | null) => value ?? "-";
  const createNullableColumn = (
    key: string,
    dataIndex: string,
    title: string,
  ) => (
    <Table.Column
      key={key}
      dataIndex={dataIndex}
      title={title}
      render={renderNullableValue}
    />
  );

  const common = [
    <Table.Column key="orderNumber" dataIndex="orderNumber" title="주문번호" />,
    <Table.Column
      key="createdAt"
      dataIndex="createdAt"
      title="주문일"
      render={formatDateTime}
    />,
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
      createNullableColumn("customerEmail", "customerEmail", "이메일"),
      ...tail,
    ];
  }

  if (orderType === "custom") {
    return [
      ...common,
      createNullableColumn("fabricType", "fabricType", "원단유형"),
      createNullableColumn("designType", "designType", "디자인유형"),
      createNullableColumn("itemQuantity", "itemQuantity", "수량"),
      ...tail,
    ];
  }

  if (orderType === "sample") {
    return [
      ...common,
      createNullableColumn("sampleType", "sampleType", "샘플유형"),
      createNullableColumn("itemQuantity", "itemQuantity", "수량"),
      ...tail,
    ];
  }

  if (orderType === "token") {
    return [
      ...common,
      createNullableColumn("customerEmail", "customerEmail", "이메일"),
      ...tail,
    ];
  }

  // repair
  return [
    ...common,
    createNullableColumn("reformSummary", "reformSummary", "수선요약"),
    ...tail,
  ];
}
