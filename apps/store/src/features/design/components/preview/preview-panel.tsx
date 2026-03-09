import { useEffect, useRef, useState } from "react";

import { OrderCta } from "@/features/design/components/preview/order-cta";
import { PreviewHeader } from "@/features/design/components/preview/preview-header";
import { ResultTagBar } from "@/features/design/components/preview/result-tag-bar";
import { TieCanvas } from "@/features/design/components/preview/tie-canvas";
import { cn } from "@/lib/utils";

interface PreviewPanelProps {
  className?: string;
}

export function PreviewPanel({ className }: PreviewPanelProps) {
  const [unmasked, setUnmasked] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleChange = () => {
      setIsFullscreen(document.fullscreenElement === sectionRef.current);
    };
    document.addEventListener("fullscreenchange", handleChange);
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, []);

  const handleToggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      sectionRef.current?.requestFullscreen();
    }
  };

  return (
    <section ref={sectionRef} className={cn("relative flex h-full flex-col bg-white p-4", className)}>
      {!isFullscreen && (
        <PreviewHeader unmasked={unmasked} onToggle={() => setUnmasked((v) => !v)} />
      )}
      <div className="flex flex-1 items-center justify-center overflow-hidden">
        <TieCanvas unmasked={unmasked} />
      </div>
      {!isFullscreen && (
        <div className="flex flex-col gap-4">
          <ResultTagBar
            isFullscreen={false}
            onToggleFullscreen={handleToggleFullscreen}
            unmasked={unmasked}
          />
          <OrderCta />
        </div>
      )}
      {isFullscreen && (
        <div className="absolute bottom-4 right-4">
          <ResultTagBar
            isFullscreen={true}
            onToggleFullscreen={handleToggleFullscreen}
            unmasked={unmasked}
          />
        </div>
      )}
    </section>
  );
}
