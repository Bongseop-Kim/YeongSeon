import type { GenerationSummaryStats } from "@/features/generation-logs/types/admin-generation-log";
import "./generation-logs.css";

interface GenerationLogStatsProps {
  stats: GenerationSummaryStats;
}

function formatStatisticNumber(value: number): string {
  return value.toLocaleString();
}

export function GenerationLogStats({ stats }: GenerationLogStatsProps) {
  const cards = [
    {
      label: "총 생성 요청",
      value: `${formatStatisticNumber(stats.totalRequests)}건`,
    },
    {
      label: "이미지 생성 성공률",
      value: `${stats.imageSuccessRate.toFixed(1)}%`,
    },
    {
      label: "총 토큰 소비",
      value: `${formatStatisticNumber(stats.totalTokensConsumed)}개`,
    },
    {
      label: "평균 응답 시간",
      value: `${formatStatisticNumber(stats.avgTotalLatencyMs)}ms`,
    },
  ];

  return (
    <section className="generationLogStatsGrid" aria-label="AI 생성 로그 요약">
      {cards.map((card) => (
        <div key={card.label} className="generationLogStatCard">
          <span className="generationLogStatLabel">{card.label}</span>
          <strong className="generationLogStatValue">{card.value}</strong>
        </div>
      ))}
    </section>
  );
}
