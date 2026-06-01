import { OrderDetailSection } from "@/features/orders";
import "@/features/orders/components/orders.css";

export default function OrderShow() {
  return (
    <main className="orderPage">
      <header className="orderPageTitleGroup">
        <h1 className="orderPageTitle">주문 상세</h1>
        <p className="orderPageDescription">
          주문 정보와 상태 변경, 배송 정보를 확인합니다.
        </p>
      </header>
      <OrderDetailSection />
    </main>
  );
}
