import { Card, Col, Row, Statistic } from "antd";
import {
  ThunderboltOutlined,
  PictureOutlined,
  DollarOutlined,
  BarChartOutlined,
} from "@ant-design/icons";
import type { GenerationSummaryStats } from "@/features/generation-logs/types/admin-generation-log";

interface GenerationLogStatsProps {
  stats: GenerationSummaryStats;
}

export function GenerationLogStats({ stats }: GenerationLogStatsProps) {
  return (
    <Row gutter={16} style={{ marginBottom: 24 }}>
      <Col xs={24} sm={12} md={6}>
        <Card>
          <Statistic
            title="총 생성 요청"
            value={stats.totalRequests}
            suffix="건"
            prefix={<BarChartOutlined />}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} md={6}>
        <Card>
          <Statistic
            title="이미지 생성 성공률"
            value={stats.imageSuccessRate}
            suffix="%"
            precision={1}
            prefix={<PictureOutlined />}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} md={6}>
        <Card>
          <Statistic
            title="총 토큰 소비"
            value={stats.totalTokensConsumed}
            suffix="개"
            prefix={<DollarOutlined />}
            formatter={(v) => Number(v).toLocaleString()}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} md={6}>
        <Card>
          <Statistic
            title="평균 응답 시간"
            value={stats.avgTotalLatencyMs}
            suffix="ms"
            prefix={<ThunderboltOutlined />}
            formatter={(v) => Number(v).toLocaleString()}
          />
        </Card>
      </Col>
    </Row>
  );
}
