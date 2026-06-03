import { AdminPageHeader } from "@/components/AdminPageHeader";
import { ClaimListTable } from "@/features/claims";

export default function ClaimList() {
  return (
    <main className="claimPage">
      <AdminPageHeader
        title="클레임 관리"
        description="취소, 반품, 교환, 토큰 환불 요청과 처리 상태를 관리합니다."
        className="claimHeader"
        titleClassName="claimTitle"
        descriptionClassName="claimDescription"
      />
      <ClaimListTable />
    </main>
  );
}
