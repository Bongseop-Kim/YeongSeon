import { Button } from "../ui/button";
import { X } from "lucide-react";

const CloseButton = ({ onRemove }: { onRemove: () => void }) => {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onRemove}
      className="h-8 w-8 p-0 text-stone-500 hover:text-stone-700"
    >
      <X className="h-4 w-4" />
    </Button>
  );
};

export default CloseButton;
