import { Show } from "@refinedev/antd";
import { useParams } from "react-router-dom";
import { Typography } from "antd";
import {
  useAdminCustomerDetail,
  useAdminCustomerOrders,
  useAdminCustomerCoupons,
} from "@/features/customers/api/customers-query";
import { CustomerProfileSection } from "@/features/customers/components/customer-profile-section";
import { CustomerOrdersTable } from "@/features/customers/components/customer-orders-table";
import { CustomerCouponsTable } from "@/features/customers/components/customer-coupons-table";

const { Title } = Typography;

export default function CustomerShow() {
  const { id } = useParams<{ id: string }>();
  const { customer } = useAdminCustomerDetail(id);
  const { orders } = useAdminCustomerOrders(customer?.id);
  const { coupons } = useAdminCustomerCoupons(customer?.id);

  return (
    <Show>
      {customer && <CustomerProfileSection customer={customer} />}
      <Title level={5}>최근 주문</Title>
      <CustomerOrdersTable orders={orders} />
      <Title level={5}>보유 쿠폰</Title>
      <CustomerCouponsTable coupons={coupons} />
    </Show>
  );
}
