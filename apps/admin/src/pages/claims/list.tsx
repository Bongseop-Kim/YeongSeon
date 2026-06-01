import { Text } from "seed-design/ui/text";
import { ClaimListTable } from "@/features/claims";
import "@/features/claims/components/claims.css";

export default function ClaimList() {
  return (
    <main className="claimPage">
      <header className="claimHeader">
        <Text as="h1" textStyle="screenTitle" className="claimTitle">
          클레임 관리
        </Text>
        <Text as="p" textStyle="t4Regular" className="claimDescription">
          취소, 반품, 교환, 토큰 환불 요청과 처리 상태를 관리합니다.
        </Text>
      </header>
      <ClaimListTable />
    </main>
  );
}
