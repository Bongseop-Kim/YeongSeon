import { Button } from "../ui/button";
import { XIcon } from "lucide-react";

const CloseButton = ({ onRemove }: { onRemove: () => void }) => {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onRemove}
      className="opacity-70 transition-opacity h-8"
    >
      <XIcon className="size-4" />
    </Button>
  );
};

export default CloseButton;
