import { MainContent, MainLayout } from "@/components/layout/main-layout";
import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FAQ_DATA } from "./constants/FAQ";

export default function FaqPage() {
  return (
    <MainLayout>
      <MainContent>
        <PageLayout>
            <Card>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {FAQ_DATA.map((faq) => (
                    <AccordionItem key={faq.id} value={faq.id}>
                      <AccordionTrigger className="text-left">
                        <div className="flex flex-col items-start gap-1">
                          <span className="text-xs text-muted-foreground">
                            {faq.category}
                          </span>
                          <span>{faq.question}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="text-sm text-muted-foreground whitespace-pre-line">
                          {faq.answer}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
        </PageLayout>
      </MainContent>
    </MainLayout>
  );
}
