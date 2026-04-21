import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { Button } from "@/shared/ui-extended/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from "@/shared/ui/field";

interface MaskCanvasProps {
  baseImageUrl: string;
  width: number;
  height: number;
  onCommit: (maskBase64: string, maskMime: "image/png") => void;
}

type Point = { x: number; y: number };

const MAX_UNDO_STEPS = 5;

const readCanvasBase64 = (canvas: HTMLCanvasElement): Promise<string> =>
  new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("mask_blob_creation_failed"));
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (typeof result !== "string") {
          reject(new Error("mask_blob_read_failed"));
          return;
        }

        resolve(result.split(",")[1] ?? "");
      };
      reader.onerror = () => reject(new Error("mask_blob_read_failed"));
      reader.readAsDataURL(blob);
    }, "image/png");
  });

export function MaskCanvas({
  baseImageUrl,
  width,
  height,
  onCommit,
}: MaskCanvasProps) {
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<Point | null>(null);
  const undoStackRef = useRef<string[]>([]);
  const [brushSize, setBrushSize] = useState(24);
  const [isErasing, setIsErasing] = useState(false);
  const [hasMask, setHasMask] = useState(false);

  useEffect(() => {
    const maskCanvas = document.createElement("canvas");
    maskCanvas.width = width;
    maskCanvas.height = height;
    maskCanvasRef.current = maskCanvas;

    const previewCanvas = previewCanvasRef.current;
    if (!previewCanvas) {
      return;
    }

    previewCanvas.width = width;
    previewCanvas.height = height;
    const previewContext = previewCanvas.getContext("2d");
    if (previewContext) {
      previewContext.clearRect(0, 0, width, height);
    }

    undoStackRef.current = [];
    setHasMask(false);
  }, [height, width, baseImageUrl]);

  const pointerToCanvasPoint = (event: PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  };

  const getStrokeStyles = useMemo(
    () => ({
      mask: isErasing ? "#000000" : "#ffffff",
    }),
    [isErasing],
  );

  const drawStroke = (from: Point, to: Point) => {
    const previewCanvas = previewCanvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    const previewContext = previewCanvas?.getContext("2d");
    const maskContext = maskCanvas?.getContext("2d");

    if (!previewContext || !maskContext || !maskCanvas) {
      return;
    }

    const drawLine = (
      context: CanvasRenderingContext2D,
      color: string,
      alpha: number,
    ) => {
      context.save();
      context.lineCap = "round";
      context.lineJoin = "round";
      context.lineWidth = brushSize;
      context.strokeStyle = color;
      context.globalAlpha = alpha;
      context.beginPath();
      context.moveTo(from.x, from.y);
      context.lineTo(to.x, to.y);
      context.stroke();
      context.restore();
    };

    drawLine(maskContext, getStrokeStyles.mask, 1);
    previewContext.clearRect(0, 0, width, height);
    previewContext.drawImage(maskCanvas, 0, 0, width, height);
    previewContext.globalCompositeOperation = "source-in";
    previewContext.fillStyle = "rgba(255, 255, 255, 0.45)";
    previewContext.fillRect(0, 0, width, height);
    previewContext.globalCompositeOperation = "source-over";
    setHasMask(true);
  };

  const pushUndoSnapshot = () => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) {
      return;
    }

    undoStackRef.current = [
      ...undoStackRef.current.slice(-(MAX_UNDO_STEPS - 1)),
      maskCanvas.toDataURL("image/png"),
    ];
  };

  const restoreMaskFromDataUrl = (dataUrl: string) => {
    const previewCanvas = previewCanvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    const previewContext = previewCanvas?.getContext("2d");
    const maskContext = maskCanvas?.getContext("2d");

    if (!previewCanvas || !maskCanvas || !previewContext || !maskContext) {
      return;
    }

    const image = new Image();
    image.onload = () => {
      maskContext.clearRect(0, 0, width, height);
      previewContext.clearRect(0, 0, width, height);
      maskContext.drawImage(image, 0, 0, width, height);
      previewContext.drawImage(image, 0, 0, width, height);
      previewContext.globalCompositeOperation = "source-in";
      previewContext.fillStyle = "rgba(255, 255, 255, 0.45)";
      previewContext.fillRect(0, 0, width, height);
      previewContext.globalCompositeOperation = "source-over";
      setHasMask(true);
    };
    image.src = dataUrl;
  };

  const handlePointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    pushUndoSnapshot();
    const point = pointerToCanvasPoint(event);
    isDrawingRef.current = true;
    lastPointRef.current = point;
    drawStroke(point, point);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !lastPointRef.current) {
      return;
    }

    const nextPoint = pointerToCanvasPoint(event);
    drawStroke(lastPointRef.current, nextPoint);
    lastPointRef.current = nextPoint;
  };

  const endDrawing = () => {
    isDrawingRef.current = false;
    lastPointRef.current = null;
  };

  const handleUndo = () => {
    const previous = undoStackRef.current.pop();
    if (!previous) {
      return;
    }

    restoreMaskFromDataUrl(previous);
  };

  const handleCommit = async () => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) {
      return;
    }

    const base64 = await readCanvasBase64(maskCanvas);
    if (base64.length === 0) {
      return;
    }

    onCommit(base64, "image/png");
  };

  return (
    <div className="space-y-3">
      <div
        className="relative overflow-hidden rounded-md border bg-black/5"
        style={{ width, height }}
      >
        <img
          src={baseImageUrl}
          alt="부분 수정 대상 이미지"
          className="absolute inset-0 h-full w-full object-cover"
          draggable={false}
        />
        <canvas
          ref={previewCanvasRef}
          className="absolute inset-0 h-full w-full touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrawing}
          onPointerLeave={endDrawing}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto_auto] md:items-end">
        <Field>
          <FieldLabel htmlFor="inpaint-brush-size">
            <FieldTitle>브러시 크기</FieldTitle>
          </FieldLabel>
          <FieldContent>
            <input
              id="inpaint-brush-size"
              type="range"
              min={8}
              max={64}
              step={1}
              value={brushSize}
              onChange={(event) => setBrushSize(Number(event.target.value))}
            />
            <FieldDescription>{brushSize}px</FieldDescription>
          </FieldContent>
        </Field>

        <Button
          type="button"
          variant="outline"
          onClick={() => setIsErasing((value) => !value)}
        >
          {isErasing ? "브러시" : "지우개"}
        </Button>
        <Button type="button" variant="outline" onClick={handleUndo}>
          실행 취소
        </Button>
        <Button type="button" onClick={handleCommit} disabled={!hasMask}>
          마스크 반영
        </Button>
      </div>
    </div>
  );
}
