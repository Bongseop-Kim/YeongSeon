import { Maximize2, RefreshCw, Wand2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDesignChat } from "@/features/design/hooks/use-design-chat";
import { useDesignChatStore } from "@/features/design/store/design-chat-store";
import { cn } from "@/lib/utils";

export function ResultTagBar() {
  const generationStatus = useDesignChatStore((state) => state.generationStatus);
  const resultTags = useDesignChatStore((state) => state.resultTags);
  const { regenerate, isLoading } = useDesignChat();

  const hidden = generationStatus === "idle" || generationStatus === "generating";

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
          title="현재 디자인 기반으로 다른 느낌의 시안 생성"
          onClick={() => {
            // TODO: 변형 플로우 연동
          }}
        >
          <Wand2 className="size-3.5" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-7"
          title="전체화면"
          onClick={() => {
            // TODO: 전체화면
          }}
        >
          <Maximize2 className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
