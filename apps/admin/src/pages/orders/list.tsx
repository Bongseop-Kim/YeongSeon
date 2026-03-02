import { List } from "@refinedev/antd";
import { Tabs } from "antd";
import { useGo } from "@refinedev/core";
import { useSearchParams } from "react-router-dom";
import { ORDER_TYPE_LABELS } from "@yeongseon/shared";
import type { OrderType } from "@yeongseon/shared";
import { DomainOrderTable } from "@/features/orders/components/domain-order-table";

const VALID_ORDER_TYPES = Object.keys(ORDER_TYPE_LABELS) as OrderType[];

function isValidOrderType(value: string | null): value is OrderType {
  return value !== null && VALID_ORDER_TYPES.includes(value as OrderType);
}

const TAB_ITEMS = VALID_ORDER_TYPES.map((key) => ({
  key,
  label: ORDER_TYPE_LABELS[key],
}));

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
