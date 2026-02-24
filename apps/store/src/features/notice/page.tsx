import { MainContent, MainLayout } from "@/components/layout/main-layout";
import TwoPanelLayout from "@/components/layout/two-panel-layout";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { NOTICE_DATA } from "./constants/NOTICE";
import { Badge } from "@/components/ui/badge";

export default function NoticePage() {
  return (
    <MainLayout>
      <MainContent>
        <TwoPanelLayout
          leftPanel={
            <Card>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {NOTICE_DATA.map((notice) => (
                    <AccordionItem key={notice.id} value={notice.id}>
                      <AccordionTrigger className="text-left">
                        <div className="flex flex-col items-start gap-1 w-full">
                          <div className="flex items-center gap-2 flex-wrap">
                            {notice.important && (
                              <Badge
                                variant="destructive"
                                className="text-xs"
                              >
                                중요
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {notice.category}
                            </span>
                            <span className="text-xs text-muted-foreground ml-auto">
                              {notice.date}
                            </span>
                          </div>
                          <span>{notice.title}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="text-sm text-muted-foreground whitespace-pre-line">
                          {notice.content}
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
