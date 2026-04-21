import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui-extended/dialog";
import { Button } from "@/shared/ui-extended/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldTitle,
} from "@/shared/ui/field";
import { Textarea } from "@/shared/ui/textarea";
import { MaskCanvas } from "@/features/design/components/inpaint/mask-canvas";
import {
  canvasToPngBase64,
  MAX_MASK_BASE64_LENGTH,
  rescaleMaskToTarget,
} from "@/features/design/lib/rescale-mask";

interface InpaintDialogProps {
  open: boolean;
  imageUrl: string;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (maskBase64: string, editPrompt: string) => void;
}

export function InpaintDialog({
  open,
  imageUrl,
  isSubmitting,
  onOpenChange,
  onSubmit,
}: InpaintDialogProps) {
  const [maskBase64, setMaskBase64] = useState("");
  const [editPrompt, setEditPrompt] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!open) {
      setMaskBase64("");
      setEditPrompt("");
      setErrorMessage(null);
    }
  }, [open]);

  const loadImageNaturalSize = async () =>
    await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        resolve({
          width: image.naturalWidth,
          height: image.naturalHeight,
        });
      };
      image.onerror = () => reject(new Error("image_load_failed"));
      image.src = imageUrl;
    });

  const handleSubmit = async () => {
    if (maskBase64.length === 0) {
      setErrorMessage("수정할 영역을 먼저 칠해 주세요.");
      return;
    }

    if (editPrompt.trim().length === 0) {
      setErrorMessage("수정 지시를 입력해 주세요.");
      return;
    }

    setErrorMessage(null);

    const sourceCanvas = maskCanvasRef.current;
    if (!sourceCanvas) {
      onSubmit(maskBase64, editPrompt.trim());
      return;
    }

    const submitPreviewMaskWithError = (context: string, error: unknown) => {
      console.error(
        `Failed to generate full-resolution mask at ${context}, using preview mask instead`,
        error,
      );
      setErrorMessage(
        "Failed to generate full-resolution mask, using preview mask instead",
      );
      onSubmit(maskBase64, editPrompt.trim());
    };

    let naturalSize: { width: number; height: number };
    try {
      naturalSize = await loadImageNaturalSize();
    } catch (error) {
      submitPreviewMaskWithError("loadImageNaturalSize", error);
      return;
    }

    let rescaledMask: HTMLCanvasElement;
    try {
      rescaledMask = await rescaleMaskToTarget(sourceCanvas, naturalSize);
    } catch (error) {
      submitPreviewMaskWithError("rescaleMaskToTarget", error);
      return;
    }

    let rescaledBase64: string;
    try {
      rescaledBase64 = await canvasToPngBase64(rescaledMask);
    } catch (error) {
      submitPreviewMaskWithError("canvasToPngBase64", error);
      return;
    }

    try {
      if (rescaledBase64.length > MAX_MASK_BASE64_LENGTH) {
        onSubmit(maskBase64, editPrompt.trim());
        return;
      }
      onSubmit(rescaledBase64, editPrompt.trim());
    } catch (error) {
      submitPreviewMaskWithError("canvasToPngBase64", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>부분 수정</DialogTitle>
          <DialogDescription>
            수정할 부분을 칠한 뒤 원하는 질감이나 표현을 설명해 주세요.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <MaskCanvas
            ref={maskCanvasRef}
            baseImageUrl={imageUrl}
            width={320}
            height={320}
            onCommit={(nextMaskBase64) => {
              setMaskBase64(nextMaskBase64);
              setErrorMessage(null);
            }}
          />

          <Field>
            <FieldLabel htmlFor="inpaint-edit-prompt">
              <FieldTitle>수정 지시</FieldTitle>
            </FieldLabel>
            <FieldContent>
              <Textarea
                id="inpaint-edit-prompt"
                maxLength={500}
                value={editPrompt}
                onChange={(event) => setEditPrompt(event.target.value)}
                placeholder="예: 이 부분만 자수 느낌으로 바꿔줘"
              />
              <FieldDescription>
                마스크 안쪽에만 적용할 재질이나 디테일을 짧게 적어 주세요.
              </FieldDescription>
              {errorMessage ? (
                <FieldError errors={[{ message: errorMessage }]} />
              ) : null}
            </FieldContent>
          </Field>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            닫기
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isSubmitting}>
            수정하기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
