import { useDesignSessionsQuery } from "@/features/design/hooks/design-session-query";
import { SessionCard } from "@/features/design/components/history/session-card";
import type { DesignSession } from "@/features/design/types/session";

interface HistoryTabProps {
  onSessionSelect: (session: DesignSession) => void;
}

export function HistoryTab({ onSessionSelect }: HistoryTabProps) {
  const {
    data: sessions = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useDesignSessionsQuery();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2 p-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded-lg bg-gray-100" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <p className="text-sm text-gray-500">
          저장된 디자인 기록을 불러오지 못했습니다.
        </p>
        {error instanceof Error ? (
          <p className="text-xs text-gray-400">{error.message}</p>
        ) : null}
        <button
          type="button"
          onClick={() => refetch()}
          className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-50"
        >
          다시 시도
        </button>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
        <p className="text-sm text-gray-400">아직 저장된 디자인이 없어요</p>
        <p className="text-xs text-gray-300">
          AI와 대화하고 이미지를 생성하면 여기에 기록됩니다
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 overflow-y-auto p-3">
      {sessions.map((session) => (
        <SessionCard
          key={session.id}
          session={session}
          onClick={onSessionSelect}
        />
      ))}
    </div>
  );
}
