import type { DesignSession } from "@/features/design/types/session";
import { cn } from "@/shared/lib/utils";

const DATE_FORMATTER = new Intl.DateTimeFormat("ko-KR", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

interface SessionCardProps {
  session: DesignSession;
  onClick: (session: DesignSession) => void;
}

export function SessionCard({ session, onClick }: SessionCardProps) {
  const formattedDate = DATE_FORMATTER.format(new Date(session.updatedAt));

  return (
    <button
      type="button"
      className={cn(
        "flex w-full items-center gap-3 rounded-lg border border-gray-200 p-2",
        "text-left transition-colors hover:bg-gray-50",
      )}
      onClick={() => onClick(session)}
    >
      <div className="h-11 w-11 shrink-0 overflow-hidden rounded bg-gray-100">
        {session.lastImageUrl ? (
          <img
            src={session.lastImageUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900">{formattedDate}</p>
        <p className="truncate text-xs text-gray-500">{session.firstMessage}</p>
        <p className="mt-0.5 text-xs text-gray-400">
          이미지 {session.imageCount}개
        </p>
      </div>
    </button>
  );
}
