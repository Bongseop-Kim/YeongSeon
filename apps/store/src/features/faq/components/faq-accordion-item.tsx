import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { FAQItem } from "@/features/faq/types/faq-types";

interface FaqAccordionItemProps {
  faq: FAQItem;
}

export function FaqAccordionItem({ faq }: FaqAccordionItemProps) {
  return (
    <AccordionItem value={faq.id}>
      <AccordionTrigger className="text-left">
        <div className="flex flex-col items-start gap-1">
          <span className="text-xs text-muted-foreground">{faq.category}</span>
          <span>{faq.question}</span>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="text-sm text-muted-foreground whitespace-pre-line">
          {faq.answer}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
