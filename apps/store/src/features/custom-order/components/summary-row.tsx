import { Button } from "@/components/ui/button";

interface SummaryRowProps {
  label: string;
  value: string;
  onEdit: () => void;
}

export const SummaryRow = ({ label, value, onEdit }: SummaryRowProps) => (
  <div className="flex min-h-10 items-start justify-between gap-2">
    <div className="flex min-w-0 flex-1 items-start text-sm">
      <span className="w-16 shrink-0 text-zinc-500">{label}</span>
      <span className="min-w-0 flex-1 break-words text-zinc-800">{value}</span>
    </div>
    <Button
      type="button"
      variant="none"
      size="sm"
      onClick={onEdit}
      aria-label={`${label} 수정`}
      className="h-6 px-1 text-[11px] font-normal text-zinc-400 hover:text-zinc-600"
    >
      수정
    </Button>
  </div>
);
