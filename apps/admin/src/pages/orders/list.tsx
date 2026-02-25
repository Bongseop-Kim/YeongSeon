import { List, useTable, TagField } from "@refinedev/antd";
import { Table, Input, Select, Space, Tabs } from "antd";
import { useNavigation, useGo } from "@refinedev/core";
import { useSearchParams } from "react-router-dom";
import type { AdminOrderListRowDTO, OrderType } from "@yeongseon/shared";
import {
  ORDER_TYPE_LABELS,
  ORDER_STATUS_OPTIONS,
  ORDER_STATUS_COLORS,
} from "@yeongseon/shared";

const VALID_ORDER_TYPES: OrderType[] = ["sale", "custom", "repair"];

function isValidOrderType(value: string | null): value is OrderType {
  return value !== null && VALID_ORDER_TYPES.includes(value as OrderType);
}

function DomainOrderTable({ orderType }: { orderType: OrderType }) {
  const { show } = useNavigation();

  const { tableProps, setFilters } = useTable<AdminOrderListRowDTO>({
    resource: "admin_order_list_view",
    sorters: { initial: [{ field: "created_at", order: "desc" }] },
    filters: {
      permanent: [
        { field: "orderType", operator: "eq", value: orderType },
      ],
    },
    syncWithLocation: false,
  });

  const statusOptions = ORDER_STATUS_OPTIONS[orderType];

  const columns = getColumnsForType(orderType);

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
      </Space>

      <Table
        {...tableProps}
        rowKey="id"
        onRow={(record) => ({
          onClick: () => show("admin_order_list_view", record.id!),
          style: { cursor: "pointer" },
        })}
      >
        {columns}
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
        <TagField value={value} color={ORDER_STATUS_COLORS[value]} />
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

const TAB_ITEMS: { key: OrderType; label: string }[] = [
  { key: "sale", label: ORDER_TYPE_LABELS.sale },
  { key: "custom", label: ORDER_TYPE_LABELS.custom },
  { key: "repair", label: ORDER_TYPE_LABELS.repair },
];

export default function OrderList() {
  const [searchParams] = useSearchParams();
  const go = useGo();
  const rawTab = searchParams.get("tab");
  const activeTab: OrderType = isValidOrderType(rawTab) ? rawTab : "sale";

  const handleTabChange = (key: string) => {
    if (!isValidOrderType(key)) return;
    go({
      query: { tab: key },
      options: { keepQuery: false },
      type: "replace",
    });
  };

  return (
    <List>
      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        destroyInactiveTabPane
        items={TAB_ITEMS.map((item) => ({
          key: item.key,
          label: item.label,
          children: <DomainOrderTable orderType={item.key} />,
        }))}
      />
    </List>
  );
}
