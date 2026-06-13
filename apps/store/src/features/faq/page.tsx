import { MainContent, MainLayout } from "@/shared/layout/main-layout";
import { PageSeo } from "@/shared/ui/page-seo";
import { PageLayout } from "@/shared/layout/page-layout";
import { PAGE_BREADCRUMBS } from "@/shared/constants/PAGE_BREADCRUMBS";
import { Accordion } from "@/shared/ui/accordion";
import { UtilityPageIntro } from "@/shared/composite/utility-page";
import { FAQ_DATA } from "@/features/faq/constants/FAQ";
import { useReformPricing } from "@/entities/reform";
import { applyTemplateTokens } from "@/shared/lib/template-tokens";
import { FaqAccordionItem } from "./components/faq-accordion-item";

export default function FaqPage() {
  const { data: reformPricing } = useReformPricing();
  const feeTokens: Record<string, string> = reformPricing
    ? {
        REFORM_SHIPPING_COST: reformPricing.shippingCost.toLocaleString(),
        REFORM_PICKUP_FEE: reformPricing.pickupFee.toLocaleString(),
      }
    : {};

  return (
    <>
      <PageSeo
        title="자주 묻는 질문"
        description="맞춤 제작 기간, 소재 선택, 주문 방법 등 영선산업 이용에 관한 궁금증을 해결해 드립니다."
        ogUrl="https://essesion.shop/faq"
      />
      <MainLayout>
        <MainContent>
          <PageLayout
            breadcrumbs={PAGE_BREADCRUMBS.FAQ}
            contentClassName="py-4 lg:py-8"
          >
            <div className="space-y-8 lg:space-y-10">
              <UtilityPageIntro
                eyebrow="FAQ"
                title="자주 묻는 질문"
                description="배송, 주문, 환불과 관련해 자주 확인하는 답변을 모아두었습니다."
              />

              <Accordion type="single" collapsible className="w-full">
                {FAQ_DATA.map((faq) => (
                  <FaqAccordionItem
                    key={faq.id}
                    faq={{
                      ...faq,
                      answer: applyTemplateTokens(faq.answer, feeTokens),
                    }}
                  />
                ))}
              </Accordion>
            </div>
          </PageLayout>
        </MainContent>
      </MainLayout>
    </>
  );
}
