import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/shared/ui/accordion";
import { Badge } from "@/shared/ui/badge";
import type { NoticeItem } from "@/features/notice/types/notice-types";

interface NoticeAccordionItemProps {
  notice: NoticeItem;
}

export function NoticeAccordionItem({ notice }: NoticeAccordionItemProps) {
  return (
    <AccordionItem value={notice.id} className="border-b border-stone-200">
      <AccordionTrigger className="px-4 py-5 text-left hover:no-underline lg:px-0">
        <div className="flex w-full flex-col items-start gap-2">
          <div className="flex w-full flex-wrap items-center gap-2 text-xs text-zinc-500">
            {notice.important && (
              <Badge variant="destructive" className="text-xs">
                중요
              </Badge>
            )}
            <span>{notice.category}</span>
            <time dateTime={notice.date} className="ml-auto">
              {notice.date}
            </time>
          </div>
          <span className="text-sm font-medium text-zinc-950">
            {notice.title}
          </span>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-4 pb-5 pt-0 lg:px-0">
        <div className="whitespace-pre-line border-l-2 border-stone-300 bg-stone-50/70 px-4 py-3 text-sm text-zinc-600">
          {notice.content}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
