import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { PAGE_BREADCRUMBS } from "@/shared/constants/PAGE_BREADCRUMBS";
import { ROUTES } from "@/shared/constants/ROUTES";
import { Button } from "@/shared/ui-extended/button";
import { MainContent, MainLayout } from "@/shared/layout/main-layout";
import { PageLayout } from "@/shared/layout/page-layout";
import { Loader2 } from "lucide-react";
import {
  submitRepairTracking,
  submitRepairNoTracking,
  orderKeys,
} from "@/entities/order";
import { useOrderDetail } from "@/entities/order";
import { toast } from "@/shared/lib/toast";
import {
  UtilityPageIntro,
  UtilityPageSection,
} from "@/shared/composite/utility-page";
import {
  RepairAddressRows,
  RepairAddressCopyButton,
  TrackingModeToggle,
  TrackingFormFields,
  NoTrackingFormFields,
  uploadRepairShippingPhotos,
  isRepairShippingReceiptIncomplete,
  useRepairShippingInput,
  type TrackingMode,
} from "@/features/order";
import type { RepairNoTrackingReason } from "@/shared/constants/REPAIR_SHIPPING";
import type { RepairShippingPhoto } from "@/shared/store/order";

interface PrefilledTracking {
  courierCompany: string;
  trackingNumber: string;
  photos?: RepairShippingPhoto[];
}

interface PrefilledNoTracking {
  reason: RepairNoTrackingReason;
  memo: string;
  photos?: RepairShippingPhoto[];
}

interface LocationState {
  prefilledTracking?: PrefilledTracking | null;
  prefilledNoTracking?: PrefilledNoTracking | null;
}

const RepairShippingPage = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;

  const prefilledTracking = state?.prefilledTracking ?? null;
  const prefilledNoTracking = state?.prefilledNoTracking ?? null;

  const { state: repairShipping, actions: repairShippingActions } =
    useRepairShippingInput({
      initialTrackingMode: prefilledNoTracking ? "no-tracking" : "has-tracking",
      initialTracking: prefilledTracking,
      initialNoTracking: prefilledNoTracking,
    });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const queryClient = useQueryClient();
  const { order, isLoading } = useOrderDetail(orderId);

  // 발송대기 아닌 상태면 주문 상세로 리다이렉트
  useEffect(() => {
    if (!isLoading && (!order || order.status !== "발송대기")) {
      navigate(`${ROUTES.ORDER_DETAIL}/${orderId}`, { replace: true });
    }
  }, [order, isLoading, navigate, orderId]);

  const isHasTracking = repairShipping.trackingMode === "has-tracking";

  const handleSubmit = async () => {
    if (!orderId) return;

    // 검증을 통과한 시점의 값으로 제출 클로저를 만든다
    let submitReceipt: () => Promise<void>;
    if (isHasTracking) {
      if (!repairShipping.courierCompany) {
        toast.error("택배사를 선택해주세요.");
        return;
      }
      if (!repairShipping.trackingNumber.trim()) {
        toast.error("송장 번호를 입력해주세요.");
        return;
      }
      submitReceipt = async () => {
        const newPhotos = await uploadRepairShippingPhotos(
          repairShipping.trackingPhotos,
        );
        await submitRepairTracking(
          orderId,
          repairShipping.courierCompany,
          repairShipping.trackingNumber.trim(),
          [...repairShipping.uploadedTrackingPhotos, ...newPhotos],
        );
      };
    } else {
      const noTrackingReason = repairShipping.noTrackingReason;
      if (!noTrackingReason) {
        toast.error("접수 사유를 선택해주세요.");
        return;
      }
      submitReceipt = async () => {
        const newPhotos = await uploadRepairShippingPhotos(
          repairShipping.noTrackingPhotos,
        );
        await submitRepairNoTracking(
          orderId,
          noTrackingReason,
          repairShipping.noTrackingMemo.trim() || null,
          [...repairShipping.uploadedNoTrackingPhotos, ...newPhotos],
        );
      };
    }

    setIsSubmitting(true);
    try {
      await submitReceipt();
      await queryClient.refetchQueries({
        queryKey: orderKeys.detail(orderId),
      });
      toast.success(
        isHasTracking
          ? "발송 정보를 등록했습니다."
          : "발송 접수를 완료했어요. 입고 확인 후 수선이 시작됩니다.",
      );
      navigate(`${ROUTES.ORDER_DETAIL}/${orderId}`, { replace: true });
    } catch (err) {
      const fallbackMessage = isHasTracking
        ? "발송 정보를 등록하지 못했어요. 다시 시도해주세요."
        : "발송 접수에 실패했어요. 다시 시도해주세요.";
      toast.error(err instanceof Error ? err.message : fallbackMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <MainContent>
          <PageLayout breadcrumbs={PAGE_BREADCRUMBS.REPAIR_SHIPPING}>
            <div className="flex items-center justify-center min-h-96">
              <Loader2 className="h-8 w-8 animate-spin text-info" />
            </div>
          </PageLayout>
        </MainContent>
      </MainLayout>
    );
  }

  if (!order || order.status !== "발송대기") {
    return null;
  }

  const isFormIncomplete = isRepairShippingReceiptIncomplete(repairShipping);
  const submitLabel = isHasTracking ? "발송 완료 등록" : "발송 확인 요청";

  return (
    <MainLayout>
      <MainContent>
        <PageLayout breadcrumbs={PAGE_BREADCRUMBS.REPAIR_SHIPPING}>
          <div className="mx-auto max-w-3xl py-6 lg:py-10">
            <div className="space-y-8">
              <UtilityPageIntro
                eyebrow="Repair Shipping"
                title="수선품 발송 등록"
                description="발송 주소를 확인한 뒤 송장 정보를 등록해주세요."
                meta={
                  <div className="rounded-xl border border-success/20 bg-success-muted px-4 py-3 text-sm text-success">
                    결제가 완료되었습니다. 수선품을 보내신 뒤 송장 정보를 남기면
                    접수가 바로 이어집니다.
                  </div>
                }
              />

              <UtilityPageSection
                title="발송 주소"
                description="수선품을 보낼 때 아래 주소를 그대로 사용하면 됩니다."
                action={<RepairAddressCopyButton />}
              >
                <div className="border-t border-stone-200 pt-5">
                  <RepairAddressRows />
                </div>
              </UtilityPageSection>

              <UtilityPageSection
                title="송장번호 등록"
                description="택배사를 선택하고 송장번호를 입력하면 발송 접수가 완료됩니다."
              >
                <div className="space-y-5 border-t border-stone-200 pt-5">
                  <TrackingModeToggle
                    value={repairShipping.trackingMode as TrackingMode}
                    onChange={(mode) => {
                      if (mode) repairShippingActions.setTrackingMode(mode);
                    }}
                  />

                  {isHasTracking ? (
                    <TrackingFormFields
                      idPrefix="repair-shipping"
                      courierCompany={repairShipping.courierCompany}
                      onCourierCompanyChange={
                        repairShippingActions.setCourierCompany
                      }
                      trackingNumber={repairShipping.trackingNumber}
                      onTrackingNumberChange={
                        repairShippingActions.setTrackingNumber
                      }
                      photos={repairShipping.trackingPhotos}
                      onPhotosChange={repairShippingActions.setTrackingPhotos}
                      photoUrls={repairShipping.uploadedTrackingPhotos.map(
                        (p) => p.url,
                      )}
                      onPhotoUrlsChange={
                        repairShippingActions.retainUploadedTrackingPhotoUrls
                      }
                    />
                  ) : (
                    <NoTrackingFormFields
                      idPrefix="repair-shipping"
                      reason={repairShipping.noTrackingReason}
                      onReasonChange={repairShippingActions.setNoTrackingReason}
                      photos={repairShipping.noTrackingPhotos}
                      onPhotosChange={repairShippingActions.setNoTrackingPhotos}
                      memo={repairShipping.noTrackingMemo}
                      onMemoChange={repairShippingActions.setNoTrackingMemo}
                      photoUrls={repairShipping.uploadedNoTrackingPhotos.map(
                        (p) => p.url,
                      )}
                      onPhotoUrlsChange={
                        repairShippingActions.retainUploadedNoTrackingPhotoUrls
                      }
                    />
                  )}

                  <Button
                    className="w-full"
                    onClick={handleSubmit}
                    disabled={isSubmitting || isFormIncomplete}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        처리 중...
                      </>
                    ) : (
                      submitLabel
                    )}
                  </Button>

                  <div className="pt-1 text-center">
                    <button
                      type="button"
                      onClick={() =>
                        navigate(`${ROUTES.ORDER_DETAIL}/${orderId}`)
                      }
                      className="text-sm text-zinc-500 underline"
                    >
                      나중에 주문 상세에서 등록하기
                    </button>
                  </div>

                  <p className="text-center text-xs text-zinc-400">
                    방문 수거는 주문 단계에서만 신청할 수 있어요.
                  </p>
                </div>
              </UtilityPageSection>
            </div>
          </div>
        </PageLayout>
      </MainContent>
    </MainLayout>
  );
};

export default RepairShippingPage;
