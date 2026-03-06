import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";

interface SummaryRowProps {
  label: string;
  value: string;
  onEdit: () => void;
}

export const SummaryRow = ({ label, value, onEdit }: SummaryRowProps) => (
  <div className="flex justify-between items-start gap-2 py-3">
    <div className="flex items-start flex-1 min-w-0 text-sm">
      <span className="text-zinc-500 w-16 shrink-0">{label}</span>
      <span className="text-zinc-900 flex-1 min-w-0 break-words">{value}</span>
    </div>
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onEdit}
      aria-label={`${label} 수정`}
      className="h-7 px-2 text-zinc-400 hover:text-zinc-600"
    >
      <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
    </Button>
  </div>
);
