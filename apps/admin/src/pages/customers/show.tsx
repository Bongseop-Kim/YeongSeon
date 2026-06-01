import { Text } from "seed-design/ui/text";
import { useParams } from "react-router-dom";
import { Callout } from "seed-design/ui/callout";
import { AdminPanelSkeleton } from "@/components/AdminSkeleton";
import {
  useAdminCustomerCoupons,
  useAdminCustomerDetail,
  useAdminCustomerOrders,
  CustomerCouponsTable,
  CustomerOrdersTable,
  CustomerProfileSection,
  CustomerTokenSection,
} from "@/features/customers";
import "@/features/customers/components/customers.css";

export default function CustomerShow() {
  const { id } = useParams<{ id: string }>();
  const customerQuery = useAdminCustomerDetail(id);
  const ordersQuery = useAdminCustomerOrders(id);
  const couponsQuery = useAdminCustomerCoupons(id);

  return (
    <main className="customerPage">
      <header className="customerHeader">
        <Text as="h1" textStyle="screenTitle" className="customerTitle">
          고객 상세
        </Text>
        <Text as="p" textStyle="t4Regular" className="customerDescription">
          고객 기본 정보, 주문, 쿠폰, 토큰을 확인합니다.
        </Text>
      </header>

      {customerQuery.isLoading ? <AdminPanelSkeleton lines={4} /> : null}
      {customerQuery.error ? (
        <Callout tone="critical" description={customerQuery.error.message} />
      ) : null}
      {customerQuery.data ? (
        <CustomerProfileSection customer={customerQuery.data} />
      ) : null}

      <section
        className="customerPanel"
        aria-labelledby="customer-orders-title"
      >
        <Text
          as="h2"
          textStyle="t6Bold"
          id="customer-orders-title"
          className="customerPanelTitle"
        >
          최근 주문
        </Text>
        {ordersQuery.error ? (
          <Callout tone="critical" description={ordersQuery.error.message} />
        ) : null}
        <CustomerOrdersTable
          orders={ordersQuery.data ?? []}
          isLoading={ordersQuery.isFetching}
        />
      </section>

      <section
        className="customerPanel"
        aria-labelledby="customer-coupons-title"
      >
        <Text
          as="h2"
          textStyle="t6Bold"
          id="customer-coupons-title"
          className="customerPanelTitle"
        >
          보유 쿠폰
        </Text>
        {couponsQuery.error ? (
          <Callout tone="critical" description={couponsQuery.error.message} />
        ) : null}
        <CustomerCouponsTable
          coupons={couponsQuery.data ?? []}
          isLoading={couponsQuery.isFetching}
        />
      </section>

      {id ? <CustomerTokenSection userId={id} /> : null}
    </main>
  );
}
