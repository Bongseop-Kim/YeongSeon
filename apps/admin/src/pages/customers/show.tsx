import { useParams } from "react-router-dom";
import { Callout } from "seed-design/ui/callout";
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
        <h1 className="customerTitle">고객 상세</h1>
        <p className="customerDescription">
          고객 기본 정보, 주문, 쿠폰, 토큰을 확인합니다.
        </p>
      </header>

      {customerQuery.isLoading ? <p>고객 정보를 불러오는 중…</p> : null}
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
        <h2 id="customer-orders-title" className="customerPanelTitle">
          최근 주문
        </h2>
        {ordersQuery.error ? (
          <Callout tone="critical" description={ordersQuery.error.message} />
        ) : null}
        {ordersQuery.isFetching ? (
          <p className="customerMutedText">주문 내역을 불러오는 중…</p>
        ) : null}
        <CustomerOrdersTable orders={ordersQuery.data ?? []} />
      </section>

      <section
        className="customerPanel"
        aria-labelledby="customer-coupons-title"
      >
        <h2 id="customer-coupons-title" className="customerPanelTitle">
          보유 쿠폰
        </h2>
        {couponsQuery.error ? (
          <Callout tone="critical" description={couponsQuery.error.message} />
        ) : null}
        {couponsQuery.isFetching ? (
          <p className="customerMutedText">쿠폰 내역을 불러오는 중…</p>
        ) : null}
        <CustomerCouponsTable coupons={couponsQuery.data ?? []} />
      </section>

      {id ? <CustomerTokenSection userId={id} /> : null}
    </main>
  );
}
