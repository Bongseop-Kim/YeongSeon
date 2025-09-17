import { Button } from "../ui/button";
import { XIcon } from "lucide-react";

const CloseButton = ({ onRemove }: { onRemove: () => void }) => {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onRemove}
      className="ring-offset-background rounded-xs focus:ring-ring data-[state=open]:bg-secondary absolute top-4 right-4 opacity-70 transition-opacity focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none"
    >
      <XIcon className="size-4" />
    </Button>
  );
};

export default CloseButton;
