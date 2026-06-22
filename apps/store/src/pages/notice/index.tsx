import { MainContent, MainLayout } from "@/shared/layout/main-layout";
import { PageLayout } from "@/shared/layout/page-layout";
import { PAGE_BREADCRUMBS } from "@/shared/constants/PAGE_BREADCRUMBS";
import { Accordion } from "@/shared/ui/accordion";
import { UtilityPageIntro } from "@/shared/composite/utility-page";
import { NOTICE_DATA, NoticeAccordionItem } from "@/features/notice";
import { PageSeo } from "@/shared/ui/page-seo";
import { useReformPricing } from "@/entities/reform";
import { applyTemplateTokens } from "@/shared/lib/template-tokens";

export default function NoticePage() {
  const {
    data: reformPricing,
    isLoading: isReformPricingLoading,
    isError: isReformPricingError,
  } = useReformPricing();
  const feeTokens: Record<string, string> = reformPricing
    ? {
        REFORM_SHIPPING_COST: reformPricing.shippingCost.toLocaleString(),
        REFORM_PICKUP_FEE: reformPricing.pickupFee.toLocaleString(),
      }
    : {};
  const reformPricingStatusText = isReformPricingError
    ? "수선 배송비와 방문 수거비 정보를 불러오지 못했습니다. 관련 공지의 금액은 —로 표시됩니다."
    : isReformPricingLoading
      ? "수선 배송비와 방문 수거비 정보를 불러오는 중입니다. 관련 공지의 금액은 잠시 —로 표시됩니다."
      : null;

  return (
    <>
      <PageSeo
        title="공지사항"
        description="영선산업 서비스 운영 변경, 점검 일정, 정책 반영 사항을 확인하세요."
        ogUrl="https://essesion.shop/notice"
      />
      <MainLayout>
        <MainContent>
          <PageLayout
            breadcrumbs={PAGE_BREADCRUMBS.NOTICE}
            contentClassName="py-4 lg:py-8"
          >
            <div className="space-y-8 lg:space-y-10">
              <UtilityPageIntro
                eyebrow="Notice"
                title="공지사항"
                description="서비스 운영 변경, 점검, 정책 반영 사항을 시간순으로 확인합니다."
              />

              <div className="space-y-3">
                {reformPricingStatusText ? (
                  <p
                    className="text-sm text-muted-foreground"
                    aria-live="polite"
                  >
                    {reformPricingStatusText}
                  </p>
                ) : null}
                <Accordion type="single" collapsible className="w-full">
                  {NOTICE_DATA.map((notice) => (
                    <NoticeAccordionItem
                      key={notice.id}
                      notice={{
                        ...notice,
                        content: applyTemplateTokens(notice.content, feeTokens),
                      }}
                    />
                  ))}
                </Accordion>
              </div>
            </div>
          </PageLayout>
        </MainContent>
      </MainLayout>
    </>
  );
}
