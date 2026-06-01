import { useParams } from "react-router-dom";
import { Callout } from "seed-design/ui/callout";
import { GenerationLogDetailPage } from "@/features/generation-logs";
import "@/features/generation-logs/components/generation-logs.css";

export default function GenerationLogDetail() {
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return (
      <main className="generationLogPage">
        <Callout
          tone="critical"
          description="잘못된 접근: id가 없습니다."
          role="alert"
        />
      </main>
    );
  }

  return <GenerationLogDetailPage id={id} />;
}
