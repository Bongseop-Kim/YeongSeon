/**
 * 생성된 패브릭 이미지를 넥타이 실루엣으로 마스킹하여 미리보기를 렌더링하는 컴포넌트
 *
 * ─── 이미지 사용 방식 ──────────────────────────────────────────────────────
 * generatedImageUrl은 raw data URL이 아닌 CSS background 단축 속성 문자열이다.
 *   형태: url("data:image/png;base64,...") center/cover no-repeat
 *   (use-design-chat.ts의 toPreviewBackground()에서 변환)
 * 이 문자열을 316×600px TieMask의 imageUrl로 전달한다.
 *
 * ─── 마스킹 구조 ──────────────────────────────────────────────────────────
 * - TieMask가 CSS mask-image: url(/images/tie.svg) 로 넥타이 실루엣 클리핑 담당
 * - tieShadow.png를 top-[-57px]로 배치해 넥타이 위쪽까지 입체감 부여
 * - unmasked=true 이면 TieMask 없이 원본 직사각형 그대로 렌더링 (다운로드 등)
 *
 * ─── 필요한 이미지 형태 ───────────────────────────────────────────────────
 * - 직사각형 패브릭 스워치 (넥타이 윤곽선 없음, 마스킹이 실루엣을 담당)
 * - 프레임 전체를 가득 채워야 함 (여백 없음)
 *   → CSS cover 배치이므로 종횡비가 맞지 않으면 상하 또는 좌우가 잘림
 * - 완전히 평평한 flat-lay (주름·그림자 없음)
 *   → 마스킹 후 자연스러운 패브릭 질감만 드러나도록
 *
 * ─── 상태에 따른 렌더링 ───────────────────────────────────────────────────
 * - idle/pending  : 첫 번째 선택 색상 또는 기본 회색(#e5e7eb)을 표시
 * - generating    : 현재 프리뷰 위에 AI shimmer 애니메이션 표시
 * - completed     : 생성된 이미지 프리뷰 표시
 */
import { TieMask } from "@/features/design/components/preview/tie-mask";
import { useDesignChatStore } from "@/features/design/store/design-chat-store";

interface TieCanvasProps {
  unmasked?: boolean;
}

export function TieCanvas({ unmasked = false }: TieCanvasProps) {
  const generationStatus = useDesignChatStore(
    (state) => state.generationStatus,
  );
  const selectedPreviewImageUrl = useDesignChatStore(
    (state) => state.selectedPreviewImageUrl,
  );
  const designContext = useDesignChatStore((state) => state.designContext);

  const isLoading =
    generationStatus === "generating" ||
    generationStatus === "regenerating" ||
    generationStatus === "rendering";
  const previewBackground =
    selectedPreviewImageUrl ?? designContext.colors[0] ?? "#e5e7eb";

  if (unmasked) {
    return (
      <div className="relative flex flex-col items-center">
        <div
          className="h-[600px] w-[316px]"
          style={{ background: previewBackground }}
        />
      </div>
    );
  }

  return (
    <div className="relative flex flex-col items-center">
      <TieMask
        imageUrl={previewBackground}
        width={316}
        height={600}
        imageClassName="transition-opacity duration-500 opacity-100"
        shadowClassName="top-[-57px]"
      >
        {isLoading ? (
          <div className="animate-ai-shimmer absolute inset-0" />
        ) : null}
      </TieMask>
    </div>
  );
}
