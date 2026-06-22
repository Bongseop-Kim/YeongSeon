import { Text } from "seed-design/ui/text";
import type { SeamlessSummaryStats } from "@/features/seamless-logs/types/admin-seamless-log";
import "./seamless-logs.css";

interface SeamlessLogStatsProps {
  stats: SeamlessSummaryStats;
}

function formatStatisticNumber(value: number): string {
  return value.toLocaleString();
}

export function SeamlessLogStats({ stats }: SeamlessLogStatsProps) {
  const cards = [
    {
      label: "총 생성 요청",
      value: `${formatStatisticNumber(stats.total)}건`,
    },
    {
      label: "성공 / 부분 / 에러",
      value: `${stats.successCount} / ${stats.partialCount} / ${stats.errorCount}`,
    },
    {
      label: "평균 생성 시간",
      value: `${formatStatisticNumber(Math.round(stats.avgGenerateMs))}ms`,
    },
    {
      label: "평균 렌더 시간",
      value: `${formatStatisticNumber(Math.round(stats.avgRenderMs))}ms`,
    },
  ];

  return (
    <section
      className="generationLogStatsGrid"
      aria-label="Seamless 생성 로그 요약"
    >
      {cards.map((card) => (
        <div key={card.label} className="generationLogStatCard">
          <Text as="span" textStyle="t3Bold" className="generationLogStatLabel">
            {card.label}
          </Text>
          <Text
            as="strong"
            textStyle="t5Bold"
            className="generationLogStatValue"
          >
            {card.value}
          </Text>
        </div>
      ))}
    </section>
  );
}
