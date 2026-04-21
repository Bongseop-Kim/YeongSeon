interface AnalysisStatusCardProps {
  eligibleForRender: boolean;
  missingRequirements: string[];
  summaryChips: string[];
  onRender?: () => void;
  onOpenOptions?: () => void;
  onFocusInput?: () => void;
}

export function AnalysisStatusCard({
  eligibleForRender,
  missingRequirements,
  summaryChips,
  onRender,
  onOpenOptions,
  onFocusInput,
}: AnalysisStatusCardProps) {
  return (
    <div className="mt-2 rounded-2xl border border-blue-100 bg-gradient-to-b from-blue-50 to-white p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <strong className="text-sm text-gray-900">분석 완료</strong>
        <span
          className={[
            "rounded-full px-2 py-0.5 text-[10px] font-semibold",
            eligibleForRender
              ? "bg-emerald-100 text-emerald-700"
              : "bg-orange-100 text-orange-700",
          ].join(" ")}
        >
          {eligibleForRender ? "바로 렌더 가능" : "입력 더 필요"}
        </span>
      </div>
      <p className="mb-2 text-xs leading-5 text-gray-600">
        {eligibleForRender
          ? "AI가 현재 요청을 이렇게 이해했습니다."
          : "아래 정보가 있으면 원하는 결과를 더 정확하게 만들 수 있어요."}
      </p>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {summaryChips.map((chip) => (
          <span
            key={chip}
            className="rounded-full border border-gray-200 bg-white px-2 py-1 text-[11px] text-gray-700"
          >
            {chip}
          </span>
        ))}
        {!eligibleForRender
          ? missingRequirements.map((item) => (
              <span
                key={item}
                className="rounded-full border border-orange-200 bg-orange-50 px-2 py-1 text-[11px] text-orange-700"
              >
                {item}
              </span>
            ))
          : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {eligibleForRender ? (
          <button
            type="button"
            onClick={onRender}
            className="rounded-xl bg-gray-900 px-3 py-2 text-xs font-semibold text-white"
          >
            이대로 렌더링
          </button>
        ) : (
          <button
            type="button"
            onClick={onOpenOptions}
            className="rounded-xl border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700"
          >
            옵션 열기
          </button>
        )}
        <button
          type="button"
          onClick={onFocusInput}
          className="rounded-xl border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700"
        >
          요청 더 수정
        </button>
      </div>
    </div>
  );
}
