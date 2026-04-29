import { useNavigate } from "react-router-dom";

import { Button } from "@/shared/ui-extended/button";
import { ROUTES } from "@/shared/constants/ROUTES";

interface ChatHeaderProps {
  tokenBalance: number | undefined;
}

export function ChatHeader({ tokenBalance }: ChatHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="flex h-14 items-center justify-end border-b px-4">
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-500">
          보유 토큰{" "}
          <strong className="font-semibold text-gray-950">
            {tokenBalance !== undefined ? tokenBalance.toLocaleString() : "0"}
          </strong>
        </span>
        <Button
          variant="default"
          size="sm"
          type="button"
          className="h-8 rounded-md px-3 text-xs"
          onClick={() => navigate(ROUTES.TOKEN_PURCHASE)}
        >
          충전
        </Button>
      </div>
    </div>
  );
}
