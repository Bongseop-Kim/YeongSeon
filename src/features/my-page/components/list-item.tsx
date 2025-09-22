import { Label } from "@/components/ui/label";
import { ChevronRightIcon } from "lucide-react";

export const ListItem = ({
  label,
  subLabel,
  onClick,
}: {
  label: string;
  subLabel?: string;
  onClick: () => void;
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between py-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 rounded"
    >
      <Label subLabel={subLabel}>{label}</Label>
      <ChevronRightIcon className="size-4 text-stone-500" />
    </button>
  );
};
