import { useState, type CSSProperties, type PointerEvent } from "react";

const MAGNIFIER_ZOOM = 2.5;
const MAGNIFIER_SIZE = 132;
const MAGNIFIER_HALF_SIZE = MAGNIFIER_SIZE / 2;

interface MagnifierPosition {
  x: number;
  y: number;
}

interface DesignPreviewMagnifierProps {
  children: React.ReactNode;
  width: number;
  height: number;
  enabled?: boolean;
}

export function DesignPreviewMagnifier({
  children,
  width,
  height,
  enabled = false,
}: DesignPreviewMagnifierProps) {
  const [position, setPosition] = useState<MagnifierPosition | null>(null);

  if (!enabled) {
    return <>{children}</>;
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") {
      setPosition(null);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.min(Math.max(event.clientX - rect.left, 0), rect.width);
    const y = Math.min(Math.max(event.clientY - rect.top, 0), rect.height);

    setPosition({
      x,
      y,
    });
  };

  const lensStyle: CSSProperties | undefined = position
    ? {
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: MAGNIFIER_SIZE,
        height: MAGNIFIER_SIZE,
        transform: "translate(-50%, -50%)",
      }
    : undefined;
  const contentStyle: CSSProperties | undefined = position
    ? {
        left: `${MAGNIFIER_HALF_SIZE - position.x * MAGNIFIER_ZOOM}px`,
        top: `${MAGNIFIER_HALF_SIZE - position.y * MAGNIFIER_ZOOM}px`,
        width,
        height,
        transform: `scale(${MAGNIFIER_ZOOM})`,
        transformOrigin: "0 0",
      }
    : undefined;

  return (
    <div
      data-testid="design-preview-zoom-surface"
      className="relative cursor-zoom-in"
      onPointerEnter={handlePointerMove}
      onPointerMove={handlePointerMove}
      onPointerLeave={() => setPosition(null)}
    >
      {children}
      {lensStyle ? (
        <div
          data-testid="design-preview-magnifier"
          className="pointer-events-none absolute z-20 overflow-hidden rounded-full border border-white/90 bg-white shadow-lg ring-1 ring-black/10"
          style={lensStyle}
        >
          <div
            aria-hidden="true"
            data-testid="design-preview-magnified-content"
            className="absolute pointer-events-none"
            style={contentStyle}
          >
            {children}
          </div>
        </div>
      ) : null}
    </div>
  );
}
