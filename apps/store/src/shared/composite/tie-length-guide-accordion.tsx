import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/shared/ui/accordion";

interface TieLengthGuideAccordionProps {
  notices: string[];
  className?: string;
}

export function TieLengthGuideAccordion({
  notices,
  className,
}: TieLengthGuideAccordionProps) {
  return (
    <Accordion type="single" collapsible className={className}>
      <AccordionItem value="notice">
        <AccordionTrigger>유의사항</AccordionTrigger>
        <AccordionContent className="space-y-2 text-zinc-600">
          {notices.map((notice) => (
            <p key={notice}>{notice}</p>
          ))}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
