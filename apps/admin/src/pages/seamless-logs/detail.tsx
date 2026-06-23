import { useParams } from "react-router-dom";
import { Callout } from "seed-design/ui/callout";
import { SeamlessLogDetailPage } from "@/features/seamless-logs";

export default function SeamlessLogDetail() {
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

  return <SeamlessLogDetailPage id={id} />;
}
