import { useRef, type ChangeEvent } from "react";
import { X } from "lucide-react";

import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui-extended/button";
import { Separator } from "@/shared/ui/separator";
import { FieldTitle } from "@/shared/ui/field";
import {
  CI_PLACEMENT_OPTIONS,
  COLOR_OPTIONS,
  PATTERN_OPTIONS,
} from "@/features/design/constants/design-options";
import type {
  CiPlacement,
  PatternOption,
} from "@/features/design/types/design-context";
import { useDesignChatStore } from "@/features/design/store/design-chat-store";
import type { Attachment } from "@/features/design/types/chat";
import { cn } from "@/shared/lib/utils";

interface AttachmentPopupProps {
  onClose: () => void;
}

function removeAttachmentsByFilter(
  attachments: Attachment[],
  removeAttachment: (index: number) => void,
  predicate: (attachment: Attachment) => boolean,
) {
  for (let i = attachments.length - 1; i >= 0; i--) {
    if (predicate(attachments[i])) {
      removeAttachment(i);
    }
  }
}

export function AttachmentPopup({ onClose }: AttachmentPopupProps) {
  const designContext = useDesignChatStore((state) => state.designContext);
  const pendingAttachments = useDesignChatStore(
    (state) => state.pendingAttachments,
  );
  const addAttachment = useDesignChatStore((state) => state.addAttachment);
  const removeAttachment = useDesignChatStore(
    (state) => state.removeAttachment,
  );
  const setDesignContext = useDesignChatStore(
    (state) => state.setDesignContext,
  );
  const ciInputRef = useRef<HTMLInputElement | null>(null);
  const referenceInputRef = useRef<HTMLInputElement | null>(null);

  const selectedColors = pendingAttachments.filter(
    (attachment) => attachment.type === "color",
  );
  const selectedColorValues =
    selectedColors.length > 0
      ? selectedColors.map((attachment) => attachment.value)
      : designContext.colors;
  const selectedPattern =
    pendingAttachments.find((attachment) => attachment.type === "pattern")
      ?.value ?? designContext.pattern;
  const selectedCiPlacement =
    pendingAttachments.find((attachment) => attachment.type === "ci-placement")
      ?.value ?? designContext.ciPlacement;

  const handleColorToggle = (label: string, value: string) => {
    const existingIndex = pendingAttachments.findIndex(
      (attachment) => attachment.type === "color" && attachment.value === value,
    );

    if (existingIndex >= 0) {
      removeAttachment(existingIndex);
      const nextColors = selectedColorValues.filter((c) => c !== value);
      setDesignContext({ colors: nextColors });
      return;
    }

    // designContext에만 있는 색상(pendingAttachment 없음) 토글 해제
    if (designContext.colors?.includes(value)) {
      setDesignContext({
        colors: designContext.colors.filter((c) => c !== value),
      });
      return;
    }

    if (selectedColorValues.length >= 2) {
      return;
    }

    addAttachment({ type: "color", label, value });
    setDesignContext({ colors: [...selectedColorValues, value] });
  };

  const handlePatternSelect = (label: string, value: PatternOption) => {
    removeAttachmentsByFilter(
      pendingAttachments,
      removeAttachment,
      (attachment) => attachment.type === "pattern",
    );
    addAttachment({ type: "pattern", label, value });
    setDesignContext({ pattern: value });
  };

  const handleCiPlacementSelect = (label: string, value: CiPlacement) => {
    removeAttachmentsByFilter(
      pendingAttachments,
      removeAttachment,
      (attachment) => attachment.type === "ci-placement",
    );
    addAttachment({ type: "ci-placement", label, value });
    setDesignContext({ ciPlacement: value });
  };

  const handleImageSelection = (
    event: ChangeEvent<HTMLInputElement>,
    label: string,
    value: "ci" | "reference",
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    removeAttachmentsByFilter(
      pendingAttachments,
      removeAttachment,
      (attachment) => attachment.type === "image" && attachment.value === value,
    );
    addAttachment({ type: "image", label, value, file });
    if (value === "ci") {
      setDesignContext({ ciImage: file });
    } else {
      setDesignContext({ referenceImage: file });
    }
    event.target.value = "";
    onClose();
  };

  return (
    <div
      id="attachment-popup"
      className="absolute z-20 bottom-full mb-2 w-72 rounded-xl border bg-white p-4 shadow-lg"
    >
      <div className="mb-3 flex items-center justify-between">
        <FieldTitle>첨부 옵션</FieldTitle>
        <Button variant="ghost" size="icon-sm" type="button" onClick={onClose}>
          <X className="size-4" />
        </Button>
      </div>

      <div className="space-y-4">
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <FieldTitle>색상</FieldTitle>
            <Badge variant="outline">{selectedColorValues.length}/2</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            {COLOR_OPTIONS.map((option) => {
              const isSelected = selectedColorValues.includes(option.value);
              const isDisabled = !isSelected && selectedColorValues.length >= 2;

              return (
                <button
                  key={option.value}
                  type="button"
                  aria-label={option.label}
                  disabled={isDisabled}
                  onClick={() => handleColorToggle(option.label, option.value)}
                  className={cn(
                    "h-8 w-8 rounded-full border-2 transition-opacity",
                    isSelected ? "border-black" : "border-transparent",
                    isDisabled
                      ? "cursor-not-allowed opacity-40"
                      : "hover:opacity-80",
                  )}
                  style={{ backgroundColor: option.value }}
                />
              );
            })}
          </div>
        </section>

        <Separator />

        <section className="space-y-2">
          <FieldTitle>패턴</FieldTitle>
          <div className="flex flex-wrap gap-2">
            {PATTERN_OPTIONS.map((option) => (
              <Button
                key={option.value}
                type="button"
                size="sm"
                variant={
                  selectedPattern === option.value ? "default" : "outline"
                }
                onClick={() => handlePatternSelect(option.label, option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </section>

        <Separator />

        <section className="space-y-2">
          <FieldTitle>배치</FieldTitle>
          <div className="flex flex-wrap gap-2">
            {CI_PLACEMENT_OPTIONS.map((option) => (
              <Button
                key={option.value}
                type="button"
                size="sm"
                variant={
                  selectedCiPlacement === option.value ? "default" : "outline"
                }
                onClick={() =>
                  handleCiPlacementSelect(option.label, option.value)
                }
              >
                {option.label}
              </Button>
            ))}
          </div>
        </section>

        <Separator />

        <section className="space-y-2">
          <FieldTitle>이미지 업로드</FieldTitle>
          <div className="flex flex-col gap-2">
            <input
              ref={ciInputRef}
              type="file"
              className="hidden"
              accept="image/*"
              onChange={(event) => handleImageSelection(event, "CI 로고", "ci")}
            />
            <input
              ref={referenceInputRef}
              type="file"
              className="hidden"
              accept="image/*"
              onChange={(event) =>
                handleImageSelection(event, "참고 이미지", "reference")
              }
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => ciInputRef.current?.click()}
            >
              CI 로고 업로드
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => referenceInputRef.current?.click()}
            >
              참고 이미지 업로드
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
