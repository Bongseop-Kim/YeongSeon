import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { DataTable } from "@/components/ui/data-table";
import { HEIGHT_GUIDE } from "@/constants/HEIGHT_GUIDE";

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
      <AccordionItem value="length-guide">
        <AccordionTrigger>내게 맞는 넥타이 길이</AccordionTrigger>
        <AccordionContent className="text-zinc-600">
          <DataTable
            headers={["키", "권장 길이"]}
            data={HEIGHT_GUIDE.map((guide) => ({
              키: guide.height,
              "권장 길이": guide.length,
            }))}
            size="sm"
          />
        </AccordionContent>
      </AccordionItem>
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
