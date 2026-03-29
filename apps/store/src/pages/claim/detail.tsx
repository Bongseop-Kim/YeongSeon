import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui-extended/button";
import { Badge } from "@/shared/ui/badge";
import { Label } from "@/shared/ui/label";
import { Separator } from "@/shared/ui/separator";
import { MainContent, MainLayout } from "@/shared/layout/main-layout";
import { PageLayout } from "@/shared/layout/page-layout";
import { OrderItemCard } from "@/shared/composite/order-item-card";
import { ClaimStatusBadge } from "@/shared/composite/status-badge";
import { Empty } from "@/shared/composite/empty";
import { getClaimTypeLabel } from "@yeongseon/shared/utils/claim-utils";
import { formatDate } from "@yeongseon/shared/utils/format-date";
import { ROUTES } from "@/shared/constants/ROUTES";
import { toast } from "@/shared/lib/toast";
import { useClaim, useCancelClaim } from "@/entities/claim";
import { useModalStore } from "@/shared/store/modal";

export default function ClaimDetailPage() {
  const { claimId } = useParams<{ claimId: string }>();
  const navigate = useNavigate();
  const { data: claim, isLoading, isError, error } = useClaim(claimId ?? "");
  const cancelClaimMutation = useCancelClaim();
  const confirm = useModalStore((state) => state.confirm);

  if (!claimId) {
    return (
      <MainLayout>
        <MainContent>
          <Card>
            <Empty
              title="잘못된 접근입니다."
              description="올바른 경로로 접근해주세요."
            />
          </Card>
        </MainContent>
      </MainLayout>
    );
  }

  if (isLoading) {
    return (
      <MainLayout>
        <MainContent>
          <div className="flex items-center justify-center min-h-96">
            <div className="text-zinc-500">클레임 정보를 불러오는 중...</div>
          </div>
        </MainContent>
      </MainLayout>
    );
  }

  if (isError) {
    return (
      <MainLayout>
        <MainContent>
          <Card>
            <Empty
              title="클레임 정보를 불러올 수 없습니다."
              description={
                error instanceof Error ? error.message : "오류가 발생했습니다."
              }
            />
            <CardContent className="pb-4">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate(ROUTES.CLAIM_LIST)}
              >
                목록으로 돌아가기
              </Button>
            </CardContent>
          </Card>
        </MainContent>
      </MainLayout>
    );
  }

  if (!claim) {
    return (
      <MainLayout>
        <MainContent>
          <Card>
            <Empty
              title="클레임을 찾을 수 없습니다."
              description="존재하지 않는 클레임이거나 접근 권한이 없습니다."
            />
            <CardContent className="pb-4">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate(ROUTES.CLAIM_LIST)}
              >
                목록으로 돌아가기
              </Button>
            </CardContent>
          </Card>
        </MainContent>
      </MainLayout>
    );
  }

  const handleCancelClaim = () => {
    confirm("클레임 신청을 취소하시겠습니까?", () => {
      cancelClaimMutation.mutate(claimId, {
        onSuccess: () => {
          toast.success("클레임 신청이 취소되었습니다.");
          navigate(ROUTES.CLAIM_LIST);
        },
        onError: (err) => {
          toast.error(
            err instanceof Error ? err.message : "클레임 취소에 실패했습니다.",
          );
        },
      });
    });
  };

  return (
    <MainLayout>
      <MainContent>
        <PageLayout>
          <Card>
            {/* 헤더 */}
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  {formatDate(claim.date)}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {getClaimTypeLabel(claim.type)}
                  </Badge>
                  <ClaimStatusBadge status={claim.status} />
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-zinc-500 mt-1">
                <span>클레임번호: {claim.claimNumber}</span>
                <span>·</span>
                <span>주문번호: {claim.orderNumber}</span>
              </div>
            </CardHeader>

            <Separator />

            {/* 주문 상품 */}
            <CardContent className="py-4">
              <OrderItemCard item={claim.item} showQuantity showPrice />
            </CardContent>

            <Separator />

            {/* 사유 */}
            <CardContent className="py-4 space-y-2">
              <div className="p-3 bg-zinc-50 rounded-md">
                <Label className="text-sm text-zinc-600">
                  사유: {claim.reason}
                </Label>
              </div>
              {claim.description && (
                <div className="p-3 bg-zinc-50 rounded-md">
                  <Label className="text-sm text-zinc-600">
                    상세: {claim.description}
                  </Label>
                </div>
              )}
            </CardContent>

            {/* 신청 취소 버튼 — 접수 상태일 때만 렌더링 */}
            {claim.status === "접수" && (
              <>
                <Separator />
                <CardContent className="py-4">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleCancelClaim}
                    disabled={cancelClaimMutation.isPending}
                  >
                    {cancelClaimMutation.isPending ? "취소 중..." : "신청 취소"}
                  </Button>
                </CardContent>
              </>
            )}
          </Card>
        </PageLayout>
      </MainContent>
    </MainLayout>
  );
}
