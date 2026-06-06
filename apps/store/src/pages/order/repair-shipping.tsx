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

  const [trackingMode, setTrackingMode] = useState<TrackingMode>(
    prefilledNoTracking ? "no-tracking" : "has-tracking",
  );
  const [courierCompany, setCourierCompany] = useState(
    prefilledTracking?.courierCompany ?? "",
  );
  const [trackingNumber, setTrackingNumber] = useState(
    prefilledTracking?.trackingNumber ?? "",
  );
  // 주문서에서 이미 업로드된 사진(URL)과 이 페이지에서 새로 고른 파일을 분리 관리
  const [uploadedTrackingPhotos, setUploadedTrackingPhotos] = useState<
    RepairShippingPhoto[]
  >(prefilledTracking?.photos ?? []);
  const [trackingPhotos, setTrackingPhotos] = useState<File[]>([]);
  const [noTrackingReason, setNoTrackingReason] = useState<
    RepairNoTrackingReason | ""
  >(prefilledNoTracking?.reason ?? "");
  const [uploadedNoTrackingPhotos, setUploadedNoTrackingPhotos] = useState<
    RepairShippingPhoto[]
  >(prefilledNoTracking?.photos ?? []);
  const [noTrackingPhotos, setNoTrackingPhotos] = useState<File[]>([]);
  const [noTrackingMemo, setNoTrackingMemo] = useState(
    prefilledNoTracking?.memo ?? "",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const queryClient = useQueryClient();
  const { order, isLoading } = useOrderDetail(orderId);

  // 발송대기 아닌 상태면 주문 상세로 리다이렉트
  useEffect(() => {
    if (!isLoading && (!order || order.status !== "발송대기")) {
      navigate(`${ROUTES.ORDER_DETAIL}/${orderId}`, { replace: true });
    }
  }, [order, isLoading, navigate, orderId]);

  const isHasTracking = trackingMode === "has-tracking";

  const handleSubmit = async () => {
    if (!orderId) return;

    // 검증을 통과한 시점의 값으로 제출 클로저를 만든다
    let submitReceipt: () => Promise<void>;
    if (isHasTracking) {
      if (!courierCompany) {
        toast.error("택배사를 선택해주세요.");
        return;
      }
      if (!trackingNumber.trim()) {
        toast.error("송장 번호를 입력해주세요.");
        return;
      }
      submitReceipt = async () => {
        const newPhotos = await uploadRepairShippingPhotos(trackingPhotos);
        await submitRepairTracking(
          orderId,
          courierCompany,
          trackingNumber.trim(),
          [...uploadedTrackingPhotos, ...newPhotos],
        );
      };
    } else {
      if (!noTrackingReason) {
        toast.error("접수 사유를 선택해주세요.");
        return;
      }
      submitReceipt = async () => {
        const newPhotos = await uploadRepairShippingPhotos(noTrackingPhotos);
        await submitRepairNoTracking(
          orderId,
          noTrackingReason,
          noTrackingMemo.trim() || null,
          [...uploadedNoTrackingPhotos, ...newPhotos],
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

  const isFormIncomplete = isHasTracking
    ? !courierCompany || !trackingNumber.trim()
    : !noTrackingReason;
  const submitLabel = isHasTracking ? "발송 완료 등록" : "발송 확인 요청";

  // 미리보기에서 제거된 URL만 남긴다 (업로드 완료 사진 삭제 반영)
  const keepPhotosByUrls = (urls: string[]) => (prev: RepairShippingPhoto[]) =>
    prev.filter((photo) => urls.includes(photo.url));

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
                    value={trackingMode}
                    onChange={(mode) => {
                      if (mode) setTrackingMode(mode);
                    }}
                  />

                  {isHasTracking ? (
                    <TrackingFormFields
                      idPrefix="repair-shipping"
                      courierCompany={courierCompany}
                      onCourierCompanyChange={setCourierCompany}
                      trackingNumber={trackingNumber}
                      onTrackingNumberChange={setTrackingNumber}
                      photos={trackingPhotos}
                      onPhotosChange={setTrackingPhotos}
                      photoUrls={uploadedTrackingPhotos.map((p) => p.url)}
                      onPhotoUrlsChange={(urls) =>
                        setUploadedTrackingPhotos(keepPhotosByUrls(urls))
                      }
                    />
                  ) : (
                    <NoTrackingFormFields
                      idPrefix="repair-shipping"
                      reason={noTrackingReason}
                      onReasonChange={setNoTrackingReason}
                      photos={noTrackingPhotos}
                      onPhotosChange={setNoTrackingPhotos}
                      memo={noTrackingMemo}
                      onMemoChange={setNoTrackingMemo}
                      photoUrls={uploadedNoTrackingPhotos.map((p) => p.url)}
                      onPhotoUrlsChange={(urls) =>
                        setUploadedNoTrackingPhotos(keepPhotosByUrls(urls))
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
