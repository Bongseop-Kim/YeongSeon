import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui-extended/button";
import { Separator } from "@/shared/ui/separator";
import { FieldTitle } from "@/shared/ui/field";
import {
  CI_PLACEMENT_OPTIONS,
  COLOR_OPTIONS,
  FABRIC_OPTIONS,
  PATTERN_OPTIONS,
} from "@/features/design/constants/design-options";
import type {
  CiPlacement,
  FabricMethod,
  PatternOption,
} from "@/features/design/types/design-context";
import { useDesignChatStore } from "@/features/design/store/design-chat-store";
import type { Attachment } from "@/features/design/types/chat";
import { cn } from "@/shared/lib/utils";

const IMAGE_COUNT_OPTIONS = [1, 2, 3, 4] as const;

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

function replaceSingleAttachment(
  attachments: Attachment[],
  removeAttachment: (index: number) => void,
  nextAttachment: Attachment,
  addAttachment: (attachment: Attachment) => void,
) {
  removeAttachmentsByFilter(
    attachments,
    removeAttachment,
    (attachment) =>
      attachment.type === nextAttachment.type &&
      (attachment.type !== "image" ||
        attachment.value === nextAttachment.value),
  );
  addAttachment(nextAttachment);
}

export function AttachmentPopup() {
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
  const selectedFabricMethod =
    pendingAttachments.find((attachment) => attachment.type === "fabric")
      ?.value ?? designContext.fabricMethod;
  const selectedImageCount = Number(
    pendingAttachments.find((attachment) => attachment.type === "image-count")
      ?.value ?? designContext.imageCount,
  ) as (typeof IMAGE_COUNT_OPTIONS)[number];

  const handleFabricMethodSelect = (label: string, value: FabricMethod) => {
    replaceSingleAttachment(
      pendingAttachments,
      removeAttachment,
      { type: "fabric", label, value },
      addAttachment,
    );
    setDesignContext({ fabricMethod: value });
  };

  const handleImageCountSelect = (
    label: string,
    value: (typeof IMAGE_COUNT_OPTIONS)[number],
  ) => {
    replaceSingleAttachment(
      pendingAttachments,
      removeAttachment,
      { type: "image-count", label, value: String(value) },
      addAttachment,
    );
    setDesignContext({ imageCount: value });
  };

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

    if (selectedColorValues.length >= 1) {
      removeAttachmentsByFilter(
        pendingAttachments,
        removeAttachment,
        (attachment) => attachment.type === "color",
      );
    }

    addAttachment({ type: "color", label, value });
    setDesignContext({ colors: [value] });
  };

  const handlePatternSelect = (label: string, value: PatternOption) => {
    replaceSingleAttachment(
      pendingAttachments,
      removeAttachment,
      { type: "pattern", label, value },
      addAttachment,
    );
    setDesignContext({ pattern: value });
  };

  const handleCiPlacementSelect = (label: string, value: CiPlacement) => {
    replaceSingleAttachment(
      pendingAttachments,
      removeAttachment,
      { type: "ci-placement", label, value },
      addAttachment,
    );
    setDesignContext({ ciPlacement: value });
  };

  return (
    <div>
      <div className="space-y-4">
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <FieldTitle>색상</FieldTitle>
            <Badge variant="outline">{selectedColorValues.length}/1</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            {COLOR_OPTIONS.map((option) => {
              const isSelected = selectedColorValues.includes(option.value);

              return (
                <button
                  key={option.value}
                  type="button"
                  aria-label={option.label}
                  onClick={() => handleColorToggle(option.label, option.value)}
                  className={cn(
                    "h-8 w-8 rounded-full border-2 transition-opacity",
                    isSelected ? "border-black" : "border-transparent",
                    "hover:opacity-80",
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
          <FieldTitle>원단</FieldTitle>
          <div className="flex flex-wrap gap-2">
            {FABRIC_OPTIONS.map((option) => (
              <Button
                key={option.value}
                type="button"
                size="sm"
                variant={
                  selectedFabricMethod === option.value ? "default" : "outline"
                }
                onClick={() =>
                  handleFabricMethodSelect(option.label, option.value)
                }
              >
                {option.label}
              </Button>
            ))}
          </div>
        </section>

        <Separator />

        <section className="space-y-2">
          <FieldTitle>생성 수량</FieldTitle>
          <div className="flex flex-wrap gap-2">
            {IMAGE_COUNT_OPTIONS.map((count) => (
              <Button
                key={count}
                type="button"
                size="sm"
                variant={selectedImageCount === count ? "default" : "outline"}
                onClick={() => handleImageCountSelect(`${count}개`, count)}
              >
                {count}개
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
      </div>
    </div>
  );
}
