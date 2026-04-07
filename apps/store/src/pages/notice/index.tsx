import { MainContent, MainLayout } from "@/shared/layout/main-layout";
import { PageLayout } from "@/shared/layout/page-layout";
import { Accordion } from "@/shared/ui/accordion";
import {
  UtilityPageIntro,
  UtilityPageSection,
} from "@/shared/composite/utility-page";
import { NOTICE_DATA, NoticeAccordionItem } from "@/features/notice";
import { PageSeo } from "@/shared/ui/page-seo";

export default function NoticePage() {
  return (
    <>
      <PageSeo
        title="공지사항"
        description="ESSE SION 서비스 운영 변경, 점검 일정, 정책 반영 사항을 확인하세요."
        ogUrl="https://essesion.shop/notice"
      />
      <MainLayout>
        <MainContent>
          <PageLayout contentClassName="py-4 lg:py-8">
            <div className="space-y-8 lg:space-y-10">
              <UtilityPageIntro
                eyebrow="Notice"
                title="공지사항"
                description="서비스 운영 변경, 점검, 정책 반영 사항을 시간순으로 확인합니다."
              />

              <UtilityPageSection
                title="공지 목록"
                description="중요 공지는 배지로 표시되며, 항목을 펼쳐 상세 내용을 볼 수 있습니다."
              >
                <Accordion type="single" collapsible className="w-full">
                  {NOTICE_DATA.map((notice) => (
                    <NoticeAccordionItem key={notice.id} notice={notice} />
                  ))}
                </Accordion>
              </UtilityPageSection>
            </div>
          </PageLayout>
        </MainContent>
      </MainLayout>
    </>
  );
}
