import { Crop, Square } from "lucide-react";

import { Button } from "@/components/ui/button";

interface PreviewHeaderProps {
  unmasked: boolean;
  onToggle: () => void;
}

export function PreviewHeader({ unmasked, onToggle }: PreviewHeaderProps) {
  return (
    <div className="flex items-center justify-end">
      <Button
        type="button"
        variant={unmasked ? "default" : "outline"}
        size="icon"
        onClick={onToggle}
        title={unmasked ? "넥타이 형태로 보기" : "패턴 전체 보기"}
        aria-label={unmasked ? "넥타이 형태로 보기" : "패턴 전체 보기"}
      >
        {unmasked ? <Square className="size-4" /> : <Crop className="size-4" />}
      </Button>
    </div>
  );
}
