import { ClaimListTable } from "@/features/claims";
import "@/features/claims/components/claims.css";

export default function ClaimList() {
  return (
    <main className="claimPage">
      <header className="claimHeader">
        <h1 className="claimTitle">클레임 관리</h1>
        <p className="claimDescription">
          취소, 반품, 교환, 토큰 환불 요청과 처리 상태를 관리합니다.
        </p>
      </header>
      <ClaimListTable />
    </main>
  );
}
