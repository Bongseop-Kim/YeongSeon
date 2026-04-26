import { useParams } from "react-router-dom";
import { Alert } from "antd";
import { GenerationLogDetailPage } from "@/features/generation-logs";

export default function GenerationLogDetail() {
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return (
      <div style={{ padding: 24 }}>
        <Alert type="error" message="잘못된 접근: id가 없습니다." showIcon />
      </div>
    );
  }

  return <GenerationLogDetailPage id={id} />;
}
