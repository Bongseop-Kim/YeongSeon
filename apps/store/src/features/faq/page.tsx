import { MainContent, MainLayout } from "@/components/layout/main-layout";
import { PageLayout } from "@/components/layout/page-layout";
import { Accordion } from "@/components/ui/accordion";
import {
  UtilityPageIntro,
  UtilityPageSection,
} from "@/components/composite/utility-page";
import { FAQ_DATA } from "@/features/faq/constants/FAQ";
import { FaqAccordionItem } from "./components/faq-accordion-item";

export default function FaqPage() {
  return (
    <MainLayout>
      <MainContent>
        <PageLayout contentClassName="py-4 lg:py-8">
          <div className="space-y-8 lg:space-y-10">
            <UtilityPageIntro
              eyebrow="FAQ"
              title="자주 묻는 질문"
              description="배송, 주문, 환불과 관련해 자주 확인하는 답변을 모아두었습니다."
            />

            <UtilityPageSection
              title="질문 목록"
              description="궁금한 항목을 펼쳐 자세한 답변을 확인하세요."
            >
              <Accordion type="single" collapsible className="w-full">
                {FAQ_DATA.map((faq) => (
                  <FaqAccordionItem key={faq.id} faq={faq} />
                ))}
              </Accordion>
            </UtilityPageSection>
          </div>
        </PageLayout>
      </MainContent>
    </MainLayout>
  );
}
