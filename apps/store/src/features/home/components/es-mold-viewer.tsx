import "@google/model-viewer";

import { HomeSectionContainer } from "@/features/home/components/home-section-container";

const TEST_MODEL_SRC =
  "https://modelviewer.dev/shared-assets/models/RobotExpressive.glb";

export const EsMoldViewer = () => {
  return (
    <section className="bg-brand-paper py-20 lg:py-28">
      <HomeSectionContainer>
        <div className="mb-8 max-w-3xl">
          <p className="text-xs uppercase tracking-[0.35em] text-brand-accent">
            Mold Viewer
          </p>
          <h2 className="font-display mt-3 text-3xl font-bold tracking-[-0.03em] text-brand-heading lg:text-4xl">
            딤플 매듭, 구조에서 시작합니다
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-brand-heading/68">
            일반 플라스틱 몰드와 다릅니다. 딤플 위치와 깊이, 매듭 실루엣을
            고려해 자체 설계한 몰드입니다. 회전하며 내부 구조를 확인하세요.
          </p>
        </div>

        <div className="overflow-hidden rounded-[var(--radius-showcase-panel)] border border-black/6 bg-[radial-gradient(circle_at_top,rgba(79,195,247,0.12),transparent_24%),linear-gradient(180deg,rgba(18,19,30,0.02),rgba(18,19,30,0.08))] shadow-[0_30px_80px_rgba(18,19,30,0.08)]">
          <div className="relative">
            <model-viewer
              src={TEST_MODEL_SRC}
              alt="테스트용 3D 모델"
              auto-rotate=""
              auto-rotate-delay="0"
              rotation-per-second="18deg"
              shadow-intensity="1"
              exposure="1.05"
              interaction-prompt="none"
              camera-orbit="35deg 72deg 2.8m"
              className="h-[440px] w-full bg-transparent lg:h-[560px]"
            />
          </div>
        </div>
      </HomeSectionContainer>
    </section>
  );
};
