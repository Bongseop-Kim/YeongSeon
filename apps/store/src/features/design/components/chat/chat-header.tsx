import { MoreHorizontal, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AiModel } from "@/features/design/types/chat";
import { ROUTES } from "@/constants/ROUTES";
import { useBreakpoint } from "@/providers/breakpoint-provider";

interface ChatHeaderProps {
  onNewChat: () => void;
  onOpenHistory: () => void;
  tokenBalance: number | undefined;
  aiModel: AiModel;
  onModelChange: (model: AiModel) => void;
}

export function ChatHeader({
  onNewChat,
  onOpenHistory,
  tokenBalance,
  aiModel,
  onModelChange,
}: ChatHeaderProps) {
  const navigate = useNavigate();
  const { isDesktop } = useBreakpoint();

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
          <div className="flex items-center gap-1.5">
            <p className="font-mono text-xs text-gray-400">
              {tokenBalance !== undefined
                ? `${tokenBalance.toLocaleString()} tokens`
                : "— tokens"}
            </p>
            <button
              type="button"
              onClick={() => navigate(ROUTES.TOKEN_PURCHASE)}
              className="text-xs text-blue-500 underline hover:text-blue-700"
            >
              충전
            </button>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Select
          value={aiModel}
          onValueChange={(value) => onModelChange(value as AiModel)}
        >
          <SelectTrigger size="sm" className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="openai">OpenAI</SelectItem>
            <SelectItem value="gemini">Gemini</SelectItem>
          </SelectContent>
        </Select>
        {isDesktop ? (
          <Button variant="outline" size="sm" type="button" onClick={onNewChat}>
            신규 대화
          </Button>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" type="button">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onOpenHistory}>
                기록 보기
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onNewChat}>신규 대화</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
