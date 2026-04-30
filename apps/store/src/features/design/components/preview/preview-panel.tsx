import { useEffect, useRef, useState } from "react";

import { OrderCta } from "@/features/design/components/preview/order-cta";
import { PreviewHeader } from "@/features/design/components/preview/preview-header";
import { ResultTagBar } from "@/features/design/components/preview/result-tag-bar";
import { TieCanvas } from "@/features/design/components/preview/tie-canvas";
import { cn } from "@/shared/lib/utils";

interface PreviewPanelProps {
  className?: string;
  onRegenerate: () => void;
}

export function PreviewPanel({ className, onRegenerate }: PreviewPanelProps) {
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
    <section
      ref={sectionRef}
      className={cn("relative flex h-full flex-col bg-white", className)}
    >
      <div className="flex flex-1 flex-col p-4">
        {!isFullscreen && (
          <div className="absolute right-4 top-4 z-10">
            <PreviewHeader
              unmasked={unmasked}
              onToggle={() => setUnmasked((v) => !v)}
            />
          </div>
        )}
        <div className="flex flex-1 items-center justify-center overflow-hidden">
          <TieCanvas unmasked={unmasked} />
        </div>
        {!isFullscreen && (
          <div className="flex flex-col gap-4 border-t border-gray-200 pt-3">
            <ResultTagBar
              isFullscreen={false}
              onToggleFullscreen={handleToggleFullscreen}
              unmasked={unmasked}
              onRegenerate={onRegenerate}
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
              onRegenerate={onRegenerate}
            />
          </div>
        )}
      </div>
    </section>
  );
}
