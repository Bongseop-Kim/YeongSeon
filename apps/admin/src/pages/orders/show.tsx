import { Text } from "seed-design/ui/text";
import { OrderDetailSection } from "@/features/orders";
import "@/features/orders/components/orders.css";

export default function OrderShow() {
  return (
    <main className="orderPage">
      <header className="orderPageTitleGroup">
        <Text as="h1" textStyle="screenTitle" className="orderPageTitle">
          주문 상세
        </Text>
        <Text as="p" textStyle="t4Regular" className="orderPageDescription">
          주문 정보와 상태 변경, 배송 정보를 확인합니다.
        </Text>
      </header>
      <OrderDetailSection />
    </main>
  );
}
