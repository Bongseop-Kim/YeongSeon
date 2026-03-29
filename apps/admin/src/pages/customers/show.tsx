import { Show } from "@refinedev/antd";
import { useParams } from "react-router-dom";
import { Typography } from "antd";
import {
  useAdminCustomerDetail,
  useAdminCustomerOrders,
  useAdminCustomerCoupons,
  CustomerProfileSection,
  CustomerOrdersTable,
  CustomerCouponsTable,
  CustomerTokenSection,
} from "@/features/customers";

const { Title } = Typography;

export default function CustomerShow() {
  const { id } = useParams<{ id: string }>();
  const { customer } = useAdminCustomerDetail(id);
  const { orders } = useAdminCustomerOrders(id);
  const { coupons } = useAdminCustomerCoupons(id);

  return (
    <Show>
      {customer && <CustomerProfileSection customer={customer} />}
      <Title level={5}>최근 주문</Title>
      <CustomerOrdersTable orders={orders} />
      <Title level={5}>보유 쿠폰</Title>
      <CustomerCouponsTable coupons={coupons} />
      <Title level={5}>토큰</Title>
      {id && <CustomerTokenSection userId={id} />}
    </Show>
  );
}
