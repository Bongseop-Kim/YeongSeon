import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/shared/ui/accordion";
import type { FAQItem } from "@/features/faq/types/faq-types";

interface FaqAccordionItemProps {
  faq: FAQItem;
}

export function FaqAccordionItem({ faq }: FaqAccordionItemProps) {
  return (
    <AccordionItem value={faq.id} className="border-b border-stone-200">
      <AccordionTrigger className="px-4 py-5 text-left hover:no-underline lg:px-0">
        <div className="flex flex-col items-start gap-1">
          <span className="text-xs text-zinc-500">{faq.category}</span>
          <span className="text-sm font-medium text-zinc-950">
            {faq.question}
          </span>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-4 pb-5 pt-0 lg:px-0">
        <div className="whitespace-pre-line border-l-2 border-stone-300 bg-stone-50/70 px-4 py-3 text-sm text-zinc-600">
          {faq.answer}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
