/**
 * 생성된 패브릭 이미지를 넥타이 실루엣으로 마스킹하여 미리보기를 렌더링하는 컴포넌트
 *
 * ─── 이미지 사용 방식 ──────────────────────────────────────────────────────
 * generatedImageUrl은 raw data URL이 아닌 CSS background 단축 속성 문자열이다.
 *   형태: url("data:image/png;base64,...") center/cover no-repeat
 *   (use-design-chat.ts의 toPreviewBackground()에서 변환)
 * 이 문자열을 316×600px div의 style.background에 직접 주입한다.
 *
 * ─── 마스킹 구조 ──────────────────────────────────────────────────────────
 * - CSS mask-image: url(/images/tie.svg) 로 div를 넥타이 실루엣 형태로 클리핑
 * - 그 위에 /images/tieShadow.png 를 z-10으로 올려 입체감을 부여
 * - unmasked=true 이면 마스크·그림자 없이 원본 직사각형 그대로 렌더링 (다운로드 등)
 *
 * ─── 필요한 이미지 형태 ───────────────────────────────────────────────────
 * - 직사각형 패브릭 스워치 (넥타이 윤곽선 없음, 마스킹이 실루엣을 담당)
 * - 프레임 전체를 가득 채워야 함 (여백 없음)
 *   → CSS cover 배치이므로 종횡비가 맞지 않으면 상하 또는 좌우가 잘림
 * - 완전히 평평한 flat-lay (주름·그림자 없음)
 *   → 마스킹 후 자연스러운 패브릭 질감만 드러나도록
 *
 * ─── 상태에 따른 렌더링 ───────────────────────────────────────────────────
 * - idle/pending  : previewColor = 첫 번째 선택 색상 또는 기본 회색(#e5e7eb)
 * - generating    : AI shimmer 애니메이션 표시
 * - completed     : 이미지 레이어(opacity-100) 전환
 */
import { useDesignChatStore } from "@/features/design/store/design-chat-store";
import { cn } from "@/lib/utils";

const tieMaskStyle = {
  maskImage: "url(/images/tie.svg)",
  maskSize: "contain",
  maskPosition: "center",
  maskRepeat: "no-repeat",
  WebkitMaskImage: "url(/images/tie.svg)",
  WebkitMaskSize: "contain",
  WebkitMaskPosition: "center",
  WebkitMaskRepeat: "no-repeat",
} as const;

interface TieCanvasProps {
  unmasked?: boolean;
}

export function TieCanvas({ unmasked = false }: TieCanvasProps) {
  const generationStatus = useDesignChatStore((state) => state.generationStatus);
  const generatedImageUrl = useDesignChatStore((state) => state.generatedImageUrl);
  const designContext = useDesignChatStore((state) => state.designContext);

  const isCompleted = generationStatus === "completed";
  const isLoading =
    generationStatus === "generating" || generationStatus === "regenerating";
  const previewColor = generatedImageUrl ?? designContext.colors[0] ?? "#e5e7eb";

  return (
    <div className="relative flex flex-col items-center">
      <div className="relative">
        {!unmasked && (
          <img
            src="/images/tieShadow.png"
            alt=""
            className="absolute top-[-57px] z-10 pointer-events-none"
          />
        )}
        <div
          className="relative flex h-[600px] w-[316px] items-center justify-center overflow-hidden"
          style={unmasked ? undefined : tieMaskStyle}
        >
          <div
            className={cn(
              "absolute inset-0 transition-opacity duration-500",
              isCompleted || unmasked ? "opacity-100" : "opacity-0",
            )}
            style={{ background: previewColor }}
          />
          {isLoading ? (
            <div className="animate-ai-shimmer absolute inset-0" />
          ) : null}
        </div>
      </div>
    </div>
  );
}
