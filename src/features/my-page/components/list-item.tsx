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
    <div onClick={onClick} className="flex items-center justify-between py-4">
      <Label subLabel={subLabel}>{label}</Label>
      <ChevronRightIcon className="size-4 text-stone-500" />
    </div>
  );
};
