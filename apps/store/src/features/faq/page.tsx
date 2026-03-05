import { MainContent, MainLayout } from "@/components/layout/main-layout";
import { PageLayout } from "@/components/layout/page-layout";
import { Accordion } from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { FAQ_DATA } from "@/features/faq/constants/FAQ";
import { FaqAccordionItem } from "./components/faq-accordion-item";

export default function FaqPage() {
  return (
    <MainLayout>
      <MainContent>
        <PageLayout>
          <Card>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {FAQ_DATA.map((faq) => (
                  <FaqAccordionItem key={faq.id} faq={faq} />
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </PageLayout>
      </MainContent>
    </MainLayout>
  );
}
