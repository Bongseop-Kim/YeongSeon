import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui-extended/button";
import { Badge } from "@/shared/ui/badge";
import { MainContent, MainLayout } from "@/shared/layout/main-layout";
import { PageLayout } from "@/shared/layout/page-layout";
import { OrderItemCard } from "@/shared/composite/order-item-card";
import { ClaimStatusBadge } from "@/shared/composite/status-badge";
import { Empty } from "@/shared/composite/empty";
import { SummaryCard } from "@/shared/composite/summary-card";
import {
  UtilityPageIntro,
  UtilityPageSection,
} from "@/shared/composite/utility-page";
import { getClaimTypeLabel } from "@yeongseon/shared/utils/claim-utils";
import { CLAIM_REASON_LABELS } from "@yeongseon/shared/constants/claim-status";
import { formatDate } from "@yeongseon/shared/utils/format-date";
import { PAGE_BREADCRUMBS } from "@/shared/constants/PAGE_BREADCRUMBS";
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
    confirm("신청을 취소하시겠습니까?", () => {
      cancelClaimMutation.mutate(claimId, {
        onSuccess: () => {
          toast.success("취소 신청이 완료되었습니다.");
          navigate(ROUTES.CLAIM_LIST);
        },
        onError: (err) => {
          toast.error(
            err instanceof Error
              ? err.message
              : "신청을 취소하지 못했어요. 다시 시도해주세요.",
          );
        },
      });
    });
  };

  const claimTypeLabel = getClaimTypeLabel(claim.type);
  const reasonLabel = CLAIM_REASON_LABELS[claim.reason] ?? claim.reason;
  const canCancelClaim = claim.status === "접수";
  const claimSummary = (
    <SummaryCard>
      <SummaryCard.Header
        title="클레임 요약"
        description="접수된 요청과 처리 상태를 확인합니다."
      />
      <SummaryCard.Section>
        <SummaryCard.Row label="신청 유형" value={claimTypeLabel} />
        <SummaryCard.Row
          label="처리 상태"
          value={<ClaimStatusBadge status={claim.status} />}
        />
        <SummaryCard.Row label="선택 사유" value={reasonLabel} />
        <SummaryCard.Row label="접수일" value={formatDate(claim.date)} />
        <SummaryCard.Row label="클레임번호" value={claim.claimNumber} />
        <SummaryCard.Row label="주문번호" value={claim.orderNumber} />
      </SummaryCard.Section>
    </SummaryCard>
  );
  const claimDetailActionBar = canCancelClaim ? (
    <Button
      variant="outline"
      className="w-full"
      size="xl"
      onClick={handleCancelClaim}
      disabled={cancelClaimMutation.isPending}
    >
      {cancelClaimMutation.isPending ? "취소 중..." : "신청 취소"}
    </Button>
  ) : null;
  const claimIntroMeta = (
    <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-600">
      <span>클레임번호 {claim.claimNumber}</span>
      <span className="text-stone-300">/</span>
      <span>주문번호 {claim.orderNumber}</span>
      <span className="text-stone-300">/</span>
      <span>{formatDate(claim.date)}</span>
      <span className="text-stone-300">/</span>
      <Badge variant="outline">{claimTypeLabel}</Badge>
      <ClaimStatusBadge status={claim.status} />
    </div>
  );

  return (
    <MainLayout>
      <MainContent className="overflow-visible">
        <PageLayout
          breadcrumbs={[
            ...PAGE_BREADCRUMBS.CLAIM_DETAIL.slice(0, -1),
            { label: `${claimTypeLabel} 상세` },
          ]}
          contentClassName="py-4 lg:py-8"
          sidebarClassName="space-y-4"
          sidebar={claimSummary}
          actionBar={claimDetailActionBar}
        >
          <div className="space-y-8" data-testid="claim-detail-root">
            <UtilityPageIntro
              eyebrow="Claim Detail"
              title={`${claimTypeLabel} 상세`}
              description="접수된 클레임의 대상 상품, 신청 사유와 처리 상태를 확인합니다."
              meta={claimIntroMeta}
            />

            <UtilityPageSection
              title="대상 상품"
              description="클레임이 접수된 주문 상품입니다."
            >
              <div className="border-t border-stone-200 py-5">
                <OrderItemCard item={claim.item} showQuantity showPrice />
              </div>
            </UtilityPageSection>

            <UtilityPageSection
              title="신청 사유"
              description="접수 시 선택한 사유와 상세 내용을 확인합니다."
            >
              <div className="space-y-3 border-t border-stone-200 py-5">
                <div className="border-l-2 border-stone-300 bg-stone-50/70 px-4 py-3">
                  <p className="text-xs text-zinc-500">사유</p>
                  <p className="mt-1 text-sm text-zinc-700">{reasonLabel}</p>
                </div>
                {claim.description ? (
                  <div className="border-l-2 border-stone-300 bg-stone-50/70 px-4 py-3">
                    <p className="text-xs text-zinc-500">상세</p>
                    <p className="mt-1 text-sm leading-6 text-zinc-700">
                      {claim.description}
                    </p>
                  </div>
                ) : null}
              </div>
            </UtilityPageSection>

            {claim.refundData ? (
              <UtilityPageSection
                title="환불 정보"
                description="토큰 환불 요청에 반영된 환불 예정 금액입니다."
              >
                <div className="border-t border-stone-200 py-5">
                  <dl className="border-l-2 border-blue-200 bg-blue-50 px-4 py-3 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-zinc-600">환불 토큰</dt>
                      <dd className="font-medium text-zinc-950">
                        {claim.refundData.paidTokenAmount}T
                      </dd>
                    </div>
                    <div className="mt-2 flex justify-between gap-4">
                      <dt className="text-zinc-600">보너스 토큰</dt>
                      <dd className="font-medium text-zinc-950">
                        {claim.refundData.bonusTokenAmount}T
                      </dd>
                    </div>
                    <div className="mt-3 flex justify-between gap-4 border-t border-blue-100 pt-3 font-semibold">
                      <dt className="text-zinc-700">환불 금액</dt>
                      <dd className="text-zinc-950">
                        {claim.refundData.refundAmount.toLocaleString()}원
                      </dd>
                    </div>
                  </dl>
                </div>
              </UtilityPageSection>
            ) : null}

            {!claim.description && !claim.refundData ? (
              <UtilityPageSection title="상세 메모">
                <div className="border-t border-stone-200 py-5">
                  <p className="text-sm text-zinc-500">
                    추가로 입력된 상세 내용이 없습니다.
                  </p>
                </div>
              </UtilityPageSection>
            ) : null}
          </div>
        </PageLayout>
      </MainContent>
    </MainLayout>
  );
}
