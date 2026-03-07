import { History, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

interface ChatHeaderProps {
  onHistoryClick: () => void;
  onNewChat: () => void;
  tokenCount: number;
}

export function ChatHeader({ onHistoryClick, onNewChat, tokenCount }: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex size-8 items-center justify-center rounded-full bg-gray-900">
          <Sparkles className="size-4 text-white" />
        </div>
        <div>
          <p className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="inline-block size-1.5 rounded-full bg-green-400" />
            디자인 준비 완료
          </p>
          <p className="font-mono text-xs text-gray-400">
            {tokenCount.toLocaleString()} tokens
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon-sm" type="button" onClick={onHistoryClick}>
          <History className="size-4" />
        </Button>
        <Button variant="outline" size="sm" type="button" onClick={onNewChat}>
          신규 대화
        </Button>
      </div>
    </div>
  );
}
