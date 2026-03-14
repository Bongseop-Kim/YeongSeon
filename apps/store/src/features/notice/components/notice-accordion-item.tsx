import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import type { NoticeItem } from "@/features/notice/types/notice-types";

interface NoticeAccordionItemProps {
  notice: NoticeItem;
}

export function NoticeAccordionItem({ notice }: NoticeAccordionItemProps) {
  return (
    <AccordionItem value={notice.id}>
      <AccordionTrigger className="text-left">
        <div className="flex flex-col items-start gap-1 w-full">
          <div className="flex items-center gap-2 flex-wrap">
            {notice.important && (
              <Badge variant="destructive" className="text-xs">
                중요
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">
              {notice.category}
            </span>
            <time
              dateTime={notice.date}
              className="text-xs text-muted-foreground ml-auto"
            >
              {notice.date}
            </time>
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
  );
}
