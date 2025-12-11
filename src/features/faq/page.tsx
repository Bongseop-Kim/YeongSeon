import { MainContent, MainLayout } from "@/components/layout/main-layout";
import TwoPanelLayout from "@/components/layout/two-panel-layout";
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
        <TwoPanelLayout
          leftPanel={
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
          }
        />
      </MainContent>
    </MainLayout>
  );
}
