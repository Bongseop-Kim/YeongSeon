import { Card } from "@/components/ui/card";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import type { DesignOptions } from "@/features/design/types/design";

interface PreviewProps {
  options: DesignOptions;
  stateSetters: any;
}

const Preview = ({ options, stateSetters }: PreviewProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // form의 값을 기반으로 position 계산
  const position = useMemo(
    () => ({
      x: (options.position + 30) / 60, // -30~30을 0~1로 변환
      y: (options.verticalPosition + 50) / 100,
    }),
    [options.position, options.verticalPosition]
  );

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    e.preventDefault();
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isDragging || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;

      const newPosition = {
        x: Math.max(0, Math.min(1, x)),
        y: Math.max(0, Math.min(1, y)),
      };
      stateSetters.setPosition(newPosition.x * 60 - 30); // 0~1을 -30~30으로 변환
      stateSetters.setVerticalPosition(newPosition.y * 100 - 50);
    },
    [isDragging, stateSetters]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mouseup", handleMouseUp);
      document.addEventListener("mousemove", (e) => {
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const x = (e.clientX - rect.left) / rect.width;
          const y = (e.clientY - rect.top) / rect.height;
          const newPosition = {
            x: Math.max(0, Math.min(1, x)),
            y: Math.max(0, Math.min(1, y)),
          };
          stateSetters.setPosition(newPosition.x * 60 - 30); // 0~1을 -30~30으로 변환
          stateSetters.setVerticalPosition(newPosition.y * 100 - 50);
        }
      });
      return () => {
        document.removeEventListener("mouseup", handleMouseUp);
        document.removeEventListener("mousemove", handleMouseMove as any);
      };
    }
  }, [isDragging, handleMouseUp, stateSetters]);

  const calculateItemPosition = (
    row: number,
    col: number,
    position: number,
    verticalPosition: number,
    itemWidth: number,
    totalRows: number
  ) => {
    // 기본 위치 계산
    const baseX = col * itemWidth;
    const baseY = row * itemWidth;

    const moveVertical = verticalPosition / 5;

    // 첫 번째 줄은 고정
    if (row === 0) {
      return { x: baseX, y: baseY - moveVertical };
    }

    // position을 -30~30 범위로 정규화 (-1 ~ 1)
    const normalizedPosition = position / 30;

    // 아래로 갈수록 이동량 증가
    const rowRatio = row / (totalRows - 1);
    const maxRowOffset = itemWidth * 3; // 3칸 이동

    // 최종 이동 거리 계산
    const moveDistance = maxRowOffset * normalizedPosition * rowRatio;

    return {
      x: baseX - moveDistance,
      y: baseY - moveVertical,
    };
  };

  const visibleItems = useMemo(() => {
    const visibleItems = [];
    const itemWidth = options.imageSize + options.gap;

    // 넥타이 마스크 영역 크기 (대략적으로)
    const tieWidth = 314;
    const tieHeight = 600;

    // 화면을 꽉 채우기 위해 필요한 행과 열 수 계산
    const neededCols = Math.ceil(tieWidth / itemWidth) + 2; // 여유분 추가
    const neededRows = Math.ceil(tieHeight / itemWidth) + 2; // 여유분 추가

    for (let row = 0; row < neededRows; row++) {
      for (let col = 0; col < neededCols; col++) {
        // grid1 패턴일 때는 체스판 패턴 적용
        const shouldShow =
          options.patternType === "grid1" ? (row + col) % 2 === 0 : true;

        if (shouldShow) {
          const position = calculateItemPosition(
            row,
            col,
            options.position,
            options.verticalPosition,
            itemWidth,
            neededRows
          );
          visibleItems.push({ ...position, key: `${row}-${col}` });
        }
      }
    }
    return visibleItems;
  }, [
    options.position,
    options.verticalPosition,
    options.imageSize,
    options.gap,
    options.horizontalCount,
    options.verticalCount,
    options.patternType,
    options.selectedFile,
    options.selectedFile2,
  ]);

  const containerStyle = useMemo(
    () => ({
      position: "relative" as const,
      width: "314px",
      height: "600px",
      overflow: "hidden",
    }),
    []
  );

  const getItemStyle = useCallback(
    (position: { x: number; y: number }) => ({
      position: "absolute" as const,
      width: `${options.imageSize}px`,
      height: `${options.imageSize}px`,
      transform: `translate(${position.x}px, ${position.y}px) rotate(${options.rotation}deg)`,
      transition: "transform 0.3s ease",
    }),
    [options.imageSize, options.rotation]
  );

  const singleImageStyle = useMemo(
    () => ({
      width: `${options.imageSize}px`,
      height: `${options.imageSize}px`,
      position: "absolute" as const,
      left: `calc(${position.x * 100}% - ${options.imageSize / 2}px)`,
      top: `calc(${position.y * 100}% - ${options.imageSize / 2}px)`,
      transform: `rotate(${options.rotation}deg)`,
      cursor: "move",
      transition: "transform 0.3s ease",
      pointerEvents: "none" as const,
    }),
    [options.imageSize, options.rotation, position.x, position.y]
  );

  const imageUrls = useMemo(
    () => ({
      first: options.selectedFile
        ? URL.createObjectURL(options.selectedFile)
        : "",
      second: options.selectedFile2
        ? URL.createObjectURL(options.selectedFile2)
        : "",
    }),
    [options.selectedFile, options.selectedFile2]
  );

  useEffect(() => {
    return () => {
      URL.revokeObjectURL(imageUrls.first);
      URL.revokeObjectURL(imageUrls.second);
    };
  }, [imageUrls]);

  return (
    <Card className="bg-white min-h-[700px] flex justify-center items-center overflow-hidden p-6">
      <div className="relative">
        <img
          src="/images/tieShadow.png"
          alt="패턴 이미지"
          className="absolute top-[-57px] z-10 pointer-events-none"
        />
        <div
          style={{
            backgroundColor: options.color,
            height: "600px",
            width: "316px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            maskImage: `url(/images/tie.svg)`,
            maskSize: "contain",
            maskPosition: "center",
            maskRepeat: "no-repeat",
            WebkitMaskImage: `url(/images/tie.svg)`,
            WebkitMaskSize: "contain",
            WebkitMaskPosition: "center",
            WebkitMaskRepeat: "no-repeat",
          }}
        >
          {options.isPattern ? (
            <div style={containerStyle}>
              {visibleItems.map((item) => {
                if (!options.selectedFile) return null;

                const row = Math.floor(Number(item.key.split("-")[0]));

                const imageUrl = options.selectedFile2
                  ? options.patternType === "grid1"
                    ? row % 2 === 0
                      ? imageUrls.first
                      : imageUrls.second
                    : (row % 2 === 0) ===
                      (Number(item.key.split("-")[1]) % 2 === 0)
                    ? imageUrls.first
                    : imageUrls.second
                  : imageUrls.first;

                return (
                  <img
                    key={item.key}
                    src={imageUrl}
                    alt="패턴 이미지"
                    style={{
                      ...getItemStyle(item),
                      objectFit: "contain",
                      borderRadius: "0.25rem",
                    }}
                    loading="lazy"
                  />
                );
              })}
            </div>
          ) : (
            <div
              ref={containerRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              style={{
                width: "100%",
                height: "100%",
                position: "relative",
                cursor: "move",
              }}
            >
              {options.selectedFile && (
                <img
                  src={imageUrls.first}
                  alt="단일 이미지"
                  style={{
                    ...singleImageStyle,
                    objectFit: "contain",
                    borderRadius: "0.25rem",
                  }}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default Preview;
