import { useEffect, useState } from "react";

import { HomeSectionContainer } from "@/features/home/components/home-section-container";

const MOLD_MODEL_SRC = import.meta.env.VITE_ES_MOLD_SRC;

export const EsMoldViewer = () => {
  const [isModelViewerReady, setIsModelViewerReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    void import("@google/model-viewer").then(() => {
      if (isMounted) {
        setIsModelViewerReady(true);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

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
            {isModelViewerReady && MOLD_MODEL_SRC ? (
              <model-viewer
                src={MOLD_MODEL_SRC}
                alt="에세시온 몰드 3D 모델"
                auto-rotate={true}
                auto-rotate-delay="0"
                rotation-per-second="18deg"
                shadow-intensity="1"
                exposure="1.05"
                interaction-prompt="none"
                camera-controls={true}
                camera-orbit="35deg 72deg 2.8m"
                className="h-[440px] w-full bg-transparent lg:h-[560px]"
              />
            ) : (
              <div className="flex h-[440px] w-full items-center justify-center px-6 text-center text-sm text-brand-heading/60 lg:h-[560px]">
                3D 몰드 모델은 준비 중입니다. 배포 환경에서는
                `VITE_ES_MOLD_SRC`를 설정해 주세요.
              </div>
            )}
          </div>
        </div>
      </HomeSectionContainer>
    </section>
  );
};
