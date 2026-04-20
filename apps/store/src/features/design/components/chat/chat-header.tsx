import { MoreHorizontal, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/shared/ui-extended/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { ROUTES } from "@/shared/constants/ROUTES";
import { useBreakpoint } from "@/shared/lib/breakpoint-provider";

interface ChatHeaderProps {
  onNewChat: () => void;
  onOpenHistory: () => void;
  tokenBalance: number | undefined;
}

export function ChatHeader({
  onNewChat,
  onOpenHistory,
  tokenBalance,
}: ChatHeaderProps) {
  const navigate = useNavigate();
  const { isDesktop } = useBreakpoint();

  return (
    <div className="flex h-16 items-center justify-between border-b px-4">
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
