import { Button } from "../ui/button";
import { XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface CloseButtonProps {
  onRemove: () => void;
  className?: string;
  variant?: "ghost" | "outline" | "none";
}

const CloseButton = ({
  onRemove,
  className,
  variant = "ghost",
}: CloseButtonProps) => {
  return (
    <Button
      type="button"
      variant={variant}
      size="sm"
      onClick={onRemove}
      className={cn("opacity-70 transition-opacity h-8 w-8", className)}
    >
      <XIcon className="size-4" />
    </Button>
  );
};

export default CloseButton;
