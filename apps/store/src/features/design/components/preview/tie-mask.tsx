import type { CSSProperties } from "react";

import { cn } from "@/lib/utils";

const tieMaskStyle: CSSProperties = {
  maskImage: "url(/images/tie.svg)",
  maskSize: "contain",
  maskPosition: "center",
  maskRepeat: "no-repeat",
  WebkitMaskImage: "url(/images/tie.svg)",
  WebkitMaskSize: "contain",
  WebkitMaskPosition: "center",
  WebkitMaskRepeat: "no-repeat",
};

interface TieMaskProps {
  imageUrl: string;
  width: number;
  height: number;
  /** 배경 레이어에 추가할 className (예: opacity transition) */
  imageClassName?: string;
  /** 그림자 이미지 위치 className. 기본값: inset-0 h-full w-full object-contain */
  shadowClassName?: string;
  /** 마스킹 영역 안에 렌더링할 오버레이 (예: shimmer) */
  children?: React.ReactNode;
}

export function TieMask({
  imageUrl,
  width,
  height,
  imageClassName,
  shadowClassName,
  children,
}: TieMaskProps) {
  return (
    <div className="relative" style={{ width, height }}>
      <div className="absolute inset-0" style={tieMaskStyle}>
        <div
          className={cn("absolute inset-0", imageClassName)}
          style={{ background: imageUrl }}
        />
        {children}
      </div>
      <img
        src="/images/tieShadow.png"
        alt=""
        className={cn(
          "pointer-events-none absolute z-10",
          shadowClassName ?? "inset-0 h-full w-full object-contain",
        )}
      />
    </div>
  );
}
