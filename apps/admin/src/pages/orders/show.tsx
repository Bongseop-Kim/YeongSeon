import { AdminPageHeader } from "@/components/AdminPageHeader";
import { OrderDetailSection } from "@/features/orders";

export default function OrderShow() {
  return (
    <main className="orderPage">
      <AdminPageHeader
        title="주문 상세"
        description="주문 정보와 상태 변경, 배송 정보를 확인합니다."
        className="orderPageTitleGroup"
        titleClassName="orderPageTitle"
        descriptionClassName="orderPageDescription"
      />
      <OrderDetailSection />
    </main>
  );
}
