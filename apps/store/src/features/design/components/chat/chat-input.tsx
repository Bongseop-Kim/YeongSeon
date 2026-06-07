import {
  type ChangeEvent,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Coins, Ellipsis, ImagePlus, X } from "lucide-react";

import { analytics } from "@/shared/lib/analytics";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui-extended/button";
import { Dialog } from "@/shared/ui-extended/dialog";
import { ResponsiveDialogScaffold } from "@/shared/ui-extended/responsive-dialog-scaffold";
import { AttachmentPopup } from "@/features/design/components/chat/attachment-popup";
import { FABRIC_OPTIONS } from "@/features/design/constants/design-options";
import { useDesignChatStore } from "@/features/design/store/design-chat-store";
import type { DesignContext } from "@/features/design/types/design-context";
import type { Attachment } from "@/features/design/types/chat";

interface ChatInputProps {
  onSend: (text: string, attachments: Attachment[]) => void;
  isLoading?: boolean;
  draftText?: string;
  draftRevision?: number;
  tokenBalance?: number;
  onCharge?: () => void;
}

interface ChatInputHandle {
  focus: () => void;
  openOptions: () => void;
}

type RemovedAttachmentContext = {
  attachment: Attachment;
  nextColorValues: string[];
};

const getNextColorValues = (
  attachments: Attachment[],
  removedIndex: number,
) => {
  const colorValues: string[] = [];

  attachments.forEach((attachment, index) => {
    if (index !== removedIndex && attachment.type === "color") {
      colorValues.push(attachment.value);
    }
  });

  return colorValues;
};

const resolveRemovedAttachmentContext = (
  attachments: Attachment[],
  removedIndex: number,
): RemovedAttachmentContext | null => {
  const attachment = attachments[removedIndex];
  if (!attachment) {
    return null;
  }

  return {
    attachment,
    nextColorValues: getNextColorValues(attachments, removedIndex),
  };
};

const getFabricMethodLabel = (value: DesignContext["fabricMethod"]): string =>
  FABRIC_OPTIONS.find((option) => option.value === value)?.label ??
  "원단 미선택";

function ImageAttachmentPreview({
  attachment,
  onRemove,
}: {
  attachment: Attachment;
  onRemove: () => void;
}) {
  const createdUrlRef = useRef<string | null>(null);
  const fileRef = useRef<File | undefined>(attachment.file);
  const [previewUrl, setPreviewUrl] = useState<string | null>(() => {
    if (!attachment.file) {
      return null;
    }

    const objectUrl = URL.createObjectURL(attachment.file);
    createdUrlRef.current = objectUrl;
    return objectUrl;
  });
  const fileName =
    attachment.file?.name ?? attachment.fileName ?? "첨부 이미지";

  useEffect(() => {
    if (!attachment.file) {
      if (createdUrlRef.current) {
        URL.revokeObjectURL(createdUrlRef.current);
        createdUrlRef.current = null;
      }
      fileRef.current = undefined;
      setPreviewUrl(null);
      return;
    }

    if (!createdUrlRef.current || fileRef.current !== attachment.file) {
      if (createdUrlRef.current) {
        URL.revokeObjectURL(createdUrlRef.current);
      }

      const objectUrl = URL.createObjectURL(attachment.file);
      createdUrlRef.current = objectUrl;
      fileRef.current = attachment.file;
      setPreviewUrl(objectUrl);
    }

    return () => {
      if (createdUrlRef.current) {
        URL.revokeObjectURL(createdUrlRef.current);
        createdUrlRef.current = null;
        fileRef.current = undefined;
      }
    };
  }, [attachment.file]);

  if (!previewUrl) {
    return null;
  }

  return (
    <div className="group relative size-24 overflow-hidden rounded-lg border bg-muted">
      <img
        src={previewUrl}
        alt={`${fileName} 프리뷰`}
        className="size-full object-cover"
      />
      <button
        type="button"
        aria-label={`${fileName} 제거`}
        onClick={onRemove}
        className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-zinc-950 text-white shadow-sm transition-colors hover:bg-gray-800"
      >
        <X className="size-3.5" />
      </button>
      <div className="absolute inset-x-0 bottom-0 truncate bg-black/55 px-2 py-1 text-[11px] text-white">
        {fileName}
      </div>
    </div>
  );
}

export const ChatInput = forwardRef<ChatInputHandle, ChatInputProps>(
  function ChatInput(
    {
      onSend,
      isLoading = false,
      draftText,
      draftRevision,
      tokenBalance,
      onCharge,
    },
    ref,
  ) {
    const designContext = useDesignChatStore((state) => state.designContext);
    const pendingAttachments = useDesignChatStore(
      (state) => state.pendingAttachments,
    );
    const addAttachment = useDesignChatStore((state) => state.addAttachment);
    const removeAttachment = useDesignChatStore(
      (state) => state.removeAttachment,
    );
    const clearAttachments = useDesignChatStore(
      (state) => state.clearAttachments,
    );
    const setDesignContext = useDesignChatStore(
      (state) => state.setDesignContext,
    );
    const [inputText, setInputText] = useState("");
    const [showPopup, setShowPopup] = useState(false);
    const optionSnapshotRef = useRef<{
      designContext: DesignContext;
      pendingAttachments: Attachment[];
    } | null>(null);
    const imageInputRef = useRef<HTMLInputElement | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const hasTrackedStartRef = useRef(false);

    const openOptionDialog = useCallback(() => {
      optionSnapshotRef.current = {
        designContext: { ...designContext },
        pendingAttachments: [...pendingAttachments],
      };
      setShowPopup(true);
    }, [designContext, pendingAttachments]);

    useImperativeHandle(
      ref,
      () => ({
        focus: () => textareaRef.current?.focus(),
        openOptions: openOptionDialog,
      }),
      [openOptionDialog],
    );

    useEffect(() => {
      setInputText(draftText ?? "");
      textareaRef.current?.focus();
    }, [draftText, draftRevision]);

    const trimmedText = inputText.trim();
    const hasImageAttachments = pendingAttachments.some(
      (attachment) => attachment.type === "image",
    );
    const hasNonImageAttachments = pendingAttachments.some(
      (attachment) => attachment.type !== "image",
    );

    const restoreOptionSnapshot = () => {
      const snapshot = optionSnapshotRef.current;
      if (!snapshot) {
        return;
      }

      setDesignContext(snapshot.designContext);
      clearAttachments();
      snapshot.pendingAttachments.forEach((attachment) => {
        addAttachment(attachment);
      });
      optionSnapshotRef.current = null;
    };

    const handleOptionOpenChange = (nextOpen: boolean) => {
      if (nextOpen) {
        openOptionDialog();
        return;
      }

      restoreOptionSnapshot();
      setShowPopup(false);
    };

    const handleOptionCancel = () => {
      restoreOptionSnapshot();
      setShowPopup(false);
    };

    const handleOptionApply = () => {
      optionSnapshotRef.current = null;
      setShowPopup(false);
    };

    const handleAttachmentRemove = (removedIndex: number) => {
      const removalContext = resolveRemovedAttachmentContext(
        pendingAttachments,
        removedIndex,
      );
      if (!removalContext) {
        return;
      }

      removeAttachment(removedIndex);

      const { attachment, nextColorValues } = removalContext;
      if (attachment.type === "color") {
        setDesignContext({ colors: nextColorValues });
        return;
      }

      if (attachment.type === "pattern") {
        setDesignContext({ pattern: null });
        return;
      }

      if (attachment.type === "ci-placement") {
        setDesignContext({ ciPlacement: null });
        return;
      }

      if (attachment.type === "image") {
        const nextSourceImage =
          pendingAttachments
            .filter(
              (nextAttachment, index) =>
                index !== removedIndex && nextAttachment.type === "image",
            )
            .find((nextAttachment) => nextAttachment.file)?.file ?? null;

        setDesignContext({
          sourceImage: nextSourceImage,
          onePointOffsetX: 0,
          onePointOffsetY: 0,
          ciImage: null,
          referenceImage: null,
        });
      }
    };

    const handleImageSelection = (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files ?? []);

      if (files.length === 0) {
        return;
      }

      files.forEach((file) => {
        addAttachment({
          type: "image",
          label: "이미지 첨부",
          value: `source-${crypto.randomUUID()}`,
          file,
        });
      });

      setDesignContext({
        sourceImage: files[0],
        onePointOffsetX: 0,
        onePointOffsetY: 0,
        ciImage: null,
        referenceImage: null,
      });
      event.target.value = "";
      setShowPopup(false);
    };

    const handleSend = () => {
      if (!trimmedText || isLoading) {
        return;
      }

      if (!hasTrackedStartRef.current) {
        analytics.track("design_chat_start", {});
        hasTrackedStartRef.current = true;
      }

      onSend(trimmedText, pendingAttachments);
      setInputText("");
      setShowPopup(false);
    };

    return (
      <div className="relative flex flex-col gap-2">
        <div className="relative rounded-xl border bg-white p-2">
          <Dialog open={showPopup} onOpenChange={handleOptionOpenChange}>
            <ResponsiveDialogScaffold
              title="첨부 옵션"
              contentId="attachment-popup"
              confirmLabel="적용"
              onCancel={handleOptionCancel}
              onConfirm={handleOptionApply}
            >
              <AttachmentPopup />
            </ResponsiveDialogScaffold>
          </Dialog>
          <div className="absolute right-3 top-3 flex items-center gap-1.5 text-xs">
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <Coins className="size-3 text-muted-foreground" />
              {tokenBalance === undefined ? "—" : tokenBalance.toLocaleString()}
            </span>
            <Button
              type="button"
              variant="none"
              size="sm"
              className="h-auto rounded-none p-0 text-xs font-medium text-foreground underline underline-offset-2"
              onClick={onCharge}
            >
              충전
            </Button>
          </div>
          {hasImageAttachments ? (
            <div className="mb-3 flex flex-wrap gap-2 px-1 pt-1">
              {pendingAttachments.map((attachment, index) =>
                attachment.type === "image" ? (
                  <ImageAttachmentPreview
                    key={`${attachment.type}-${attachment.value}-${index}`}
                    attachment={attachment}
                    onRemove={() => handleAttachmentRemove(index)}
                  />
                ) : null,
              )}
            </div>
          ) : null}
          <textarea
            ref={textareaRef}
            rows={1}
            aria-label="디자인 요청 메시지"
            value={inputText}
            placeholder="원하는 넥타이 스타일, 원단, 색상, 로고 배치를 입력하세요..."
            onChange={(event) => setInputText(event.target.value)}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                handleSend();
              }
            }}
            className="max-h-32 min-h-[40px] w-full resize-none border-0 bg-transparent px-2 py-1 pr-20 text-base outline-none [scrollbar-width:none] md:text-sm [&::-webkit-scrollbar]:hidden"
          />
          <div
            data-testid="chat-input-selected-option-row"
            className="mt-2 flex min-w-0 items-start justify-between gap-2 px-1"
          >
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
              {hasNonImageAttachments
                ? pendingAttachments.map((attachment, index) =>
                    attachment.type === "image" ? null : (
                      <Badge
                        key={`${attachment.type}-${attachment.value}-${index}`}
                        variant="outline"
                        className="flex max-w-32 items-center gap-1 truncate"
                      >
                        <span className="truncate">{attachment.label}</span>
                        <button
                          type="button"
                          aria-label={`${attachment.label} 제거`}
                          onClick={() => handleAttachmentRemove(index)}
                        >
                          <X className="size-3" />
                        </button>
                      </Badge>
                    ),
                  )
                : null}
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">
              {getFabricMethodLabel(designContext.fabricMethod)} ·{" "}
              {designContext.imageCount}개
            </span>
          </div>
          <div className="mt-2 flex flex-col gap-2 border-t pt-2">
            <div className="flex items-center justify-between gap-2">
              <div
                data-testid="chat-input-option-row"
                className="flex min-w-0 flex-1 items-center gap-2"
              >
                <div className="flex items-center gap-0.5">
                  <input
                    ref={imageInputRef}
                    type="file"
                    aria-label="이미지 파일 선택"
                    className="hidden"
                    accept="image/*"
                    multiple
                    onChange={handleImageSelection}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="이미지 첨부"
                    className="bg-transparent hover:bg-transparent"
                    onClick={() => imageInputRef.current?.click()}
                  >
                    <ImagePlus className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="옵션 추가"
                    aria-expanded={showPopup}
                    aria-controls="attachment-popup"
                    className="bg-transparent hover:bg-transparent"
                    onClick={openOptionDialog}
                  >
                    <Ellipsis className="size-4" />
                  </Button>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                aria-label="생성"
                className="h-8 rounded-md px-4 text-xs"
                onClick={handleSend}
                disabled={!trimmedText || isLoading}
              >
                생성
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  },
);
