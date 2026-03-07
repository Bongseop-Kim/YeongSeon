import { useState } from "react";

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

  return (
    <section className={cn("flex h-full flex-col bg-white p-4", className)}>
      <PreviewHeader unmasked={unmasked} onToggle={() => setUnmasked((v) => !v)} />
      <div className="flex flex-1 items-center justify-center overflow-hidden">
        <TieCanvas unmasked={unmasked} />
      </div>
      <div className="flex flex-col gap-4">
        <ResultTagBar />
        <OrderCta />
      </div>
    </section>
  );
}
