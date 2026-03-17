import { Card, Col, Row, Statistic } from "antd";
import {
  ShoppingOutlined,
  DollarOutlined,
  ExceptionOutlined,
  QuestionCircleOutlined,
} from "@ant-design/icons";
import type { AdminDashboardStats } from "@/features/dashboard/types/admin-dashboard";

export function DashboardStatsRow({ stats }: { stats: AdminDashboardStats }) {
  return (
    <Row gutter={16} style={{ marginBottom: 24 }}>
      <Col xs={24} sm={12} md={6}>
        <Card>
          <Statistic
            title="주문"
            value={stats.orderCount}
            suffix="건"
            prefix={<ShoppingOutlined />}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} md={6}>
        <Card>
          <Statistic
            title="매출"
            value={stats.revenue}
            suffix="원"
            prefix={<DollarOutlined />}
            formatter={(v) => Number(v).toLocaleString()}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} md={6}>
        <Card>
          <Statistic
            title="미처리 클레임"
            value={stats.pendingClaimCount}
            suffix="건"
            prefix={<ExceptionOutlined />}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} md={6}>
        <Card>
          <Statistic
            title="미답변 문의"
            value={stats.pendingInquiryCount}
            suffix="건"
            prefix={<QuestionCircleOutlined />}
          />
        </Card>
      </Col>
    </Row>
  );
}
