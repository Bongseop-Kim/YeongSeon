import type { ReactNode } from "react";
import { UtilityPageAside } from "@/components/composite/utility-page";
import { cn } from "@/lib/utils";

interface StepLayoutProps {
  guideTitle: string;
  guideItems: string[];
  children: ReactNode;
  className?: string;
}

export const StepLayout = ({
  guideTitle,
  guideItems,
  children,
  className,
}: StepLayoutProps) => (
  <div className={cn("space-y-6", className)}>
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10">
      <div className="lg:sticky lg:top-28 lg:self-start">
        <UtilityPageAside
          title={guideTitle}
          description="현재 단계에서 판단 기준이 되는 핵심만 정리했습니다."
          tone="muted"
          className="border border-stone-200 bg-stone-50/55 p-4 lg:p-5"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
            Guide
          </p>
          <ul className="mt-4 space-y-2.5 border-l border-stone-200 pl-4">
            {guideItems.map((item) => (
              <li
                key={`${guideTitle}-${item}`}
                className="text-sm leading-6 text-zinc-600"
              >
                {item}
              </li>
            ))}
          </ul>
        </UtilityPageAside>
      </div>
      <div className="space-y-10">{children}</div>
    </div>
  </div>
);
