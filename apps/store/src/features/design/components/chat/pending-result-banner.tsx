interface Props {
  onConfirm: () => void;
  onDismiss: () => void;
}

export function PendingResultBanner({ onConfirm, onDismiss }: Props) {
  return (
    <div className="flex items-center justify-between gap-3 border-b bg-muted/60 px-4 py-2.5 text-sm">
      <span className="text-foreground">
        이전 AI 디자인 생성 결과가 저장되었습니다.
      </span>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onConfirm}
          className="font-medium text-primary underline-offset-2 hover:underline"
        >
          기록에서 확인하기
        </button>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="닫기"
          className="text-muted-foreground hover:text-foreground"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
