import { MainContent, MainLayout } from "@/components/layout/main-layout";
import { PageLayout } from "@/components/layout/page-layout";
import { Accordion } from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { NOTICE_DATA } from "@/features/notice/constants/NOTICE";
import { NoticeAccordionItem } from "./components/notice-accordion-item";

export default function NoticePage() {
  return (
    <MainLayout>
      <MainContent>
        <PageLayout>
          <Card>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {NOTICE_DATA.map((notice) => (
                  <NoticeAccordionItem key={notice.id} notice={notice} />
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </PageLayout>
      </MainContent>
    </MainLayout>
  );
}
