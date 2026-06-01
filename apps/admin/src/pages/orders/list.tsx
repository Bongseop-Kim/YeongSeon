import { Text } from "seed-design/ui/text";
import { useSearchParams } from "react-router-dom";
import { ORDER_TYPE_LABELS } from "@yeongseon/shared";
import type { OrderType } from "@yeongseon/shared";
import { DomainOrderTable } from "@/features/orders";
import "@/features/orders/components/orders.css";

const VALID_ORDER_TYPES = Object.keys(ORDER_TYPE_LABELS) as OrderType[];

function isValidOrderType(value: string | null): value is OrderType {
  return value !== null && VALID_ORDER_TYPES.includes(value as OrderType);
}

export default function OrderList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get("tab");
  const activeTab: OrderType = isValidOrderType(rawTab) ? rawTab : "sale";

  const handleTabChange = (nextTab: OrderType): void => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("tab", nextTab);
        next.set("page", "1");
        next.delete("status");
        next.delete("orderNumber");
        return next;
      },
      { replace: true },
    );
  };

  return (
    <main className="orderPage">
      <header className="orderPageTitleGroup">
        <Text as="h1" textStyle="screenTitle" className="orderPageTitle">
          주문
        </Text>
        <Text as="p" textStyle="t4Regular" className="orderPageDescription">
          판매·제작·수선·토큰 주문 상태와 배송 정보를 관리합니다.
        </Text>
      </header>

      <nav className="orderTabList" aria-label="주문 유형">
        {VALID_ORDER_TYPES.map((orderType) => (
          <button
            key={orderType}
            type="button"
            className="orderTabButton"
            role="tab"
            aria-selected={activeTab === orderType}
            onClick={() => handleTabChange(orderType)}
          >
            {ORDER_TYPE_LABELS[orderType]}
          </button>
        ))}
      </nav>

      <DomainOrderTable orderType={activeTab} />
    </main>
  );
}
