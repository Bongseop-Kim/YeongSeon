import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";

interface SummaryRowProps {
  label: string;
  value: string;
  onEdit: () => void;
}

export const SummaryRow = ({ label, value, onEdit }: SummaryRowProps) => (
  <div className="flex justify-between items-center">
    <div>
      <span className="text-sm text-zinc-500">{label}</span>
      <span className="text-sm text-zinc-900 ml-3">{value}</span>
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
