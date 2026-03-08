import { Download, Maximize2, Minimize2, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDesignChat } from "@/features/design/hooks/use-design-chat";
import { useDesignChatStore } from "@/features/design/store/design-chat-store";
import { cn } from "@/lib/utils";

const extractImageUrl = (background: string): string | null => {
  const match = /url\("(.+?)"\)/.exec(background);
  return match?.[1] ?? null;
};

interface ResultTagBarProps {
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export function ResultTagBar({ isFullscreen, onToggleFullscreen }: ResultTagBarProps) {
  const generationStatus = useDesignChatStore((state) => state.generationStatus);
  const resultTags = useDesignChatStore((state) => state.resultTags);
  const generatedImageUrl = useDesignChatStore((state) => state.generatedImageUrl);
  const markImageDownloaded = useDesignChatStore((state) => state.markImageDownloaded);
  const { regenerate, isLoading } = useDesignChat();

  const hidden = generationStatus === "idle" || generationStatus === "generating";

  const handleDownload = () => {
    const url = extractImageUrl(generatedImageUrl ?? "");
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = "design.png";
    a.click();
    markImageDownloaded();
  };

  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-3", hidden && "invisible")}>
      <div className="flex flex-wrap items-center gap-2">
        {resultTags.map((tag) => (
          <Badge key={tag} variant="secondary">
            {tag}
          </Badge>
        ))}
      </div>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-7"
          title="같은 조건으로 다시 생성"
          disabled={isLoading}
          onClick={regenerate}
        >
          <RefreshCw className="size-3.5" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-7"
          title="이미지 다운로드"
          onClick={handleDownload}
        >
          <Download className="size-3.5" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-7"
          title={isFullscreen ? "전체화면 종료" : "전체화면"}
          onClick={onToggleFullscreen}
        >
          {isFullscreen ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
        </Button>
      </div>
    </div>
  );
}
