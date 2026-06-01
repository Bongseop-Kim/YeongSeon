import type { AdminDashboardStats } from "@/features/dashboard/types/admin-dashboard";
import { formatMoney } from "@/utils/format-number";

interface DashboardStatCard {
  label: string;
  value: string;
  helper: string;
}

export function DashboardStatsRow({ stats }: { stats: AdminDashboardStats }) {
  const cards: DashboardStatCard[] = [
    {
      label: "주문",
      value: `${stats.orderCount.toLocaleString("ko-KR")}건`,
      helper: "선택 기간 주문 수",
    },
    {
      label: "매출",
      value: formatMoney(stats.revenue),
      helper: "선택 기간 결제 금액",
    },
    {
      label: "미처리 클레임",
      value: `${stats.pendingClaimCount.toLocaleString("ko-KR")}건`,
      helper: "접수·처리중",
    },
    {
      label: "미답변 문의",
      value: `${stats.pendingInquiryCount.toLocaleString("ko-KR")}건`,
      helper: "답변대기",
    },
  ];

  return (
    <div className="dashboardStatsGrid" aria-label="대시보드 통계">
      {cards.map((card) => (
        <article key={card.label} className="dashboardStatCard">
          <p className="dashboardStatLabel">{card.label}</p>
          <strong className="dashboardStatValue">{card.value}</strong>
          <p className="dashboardMutedText">{card.helper}</p>
        </article>
      ))}
    </div>
  );
}
