import { useEffect, useRef, useState } from "react";
import { Plus, Send, X } from "lucide-react";

import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui-extended/button";
import { AttachmentPopup } from "@/features/design/components/chat/attachment-popup";
import { FABRIC_OPTIONS } from "@/features/design/constants/design-options";
import { useDesignChatStore } from "@/features/design/store/design-chat-store";
import type { FabricMethod } from "@/features/design/types/design-context";
import type { Attachment } from "@/features/design/types/chat";

interface ChatInputProps {
  onSend: (text: string, attachments: Attachment[]) => void;
  isLoading?: boolean;
}

export function ChatInput({ onSend, isLoading = false }: ChatInputProps) {
  const designContext = useDesignChatStore((state) => state.designContext);
  const pendingAttachments = useDesignChatStore(
    (state) => state.pendingAttachments,
  );
  const removeAttachment = useDesignChatStore(
    (state) => state.removeAttachment,
  );
  const setDesignContext = useDesignChatStore(
    (state) => state.setDesignContext,
  );
  const [inputText, setInputText] = useState("");
  const [showPopup, setShowPopup] = useState(false);
  const popupWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showPopup) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popupWrapperRef.current &&
        !popupWrapperRef.current.contains(e.target as Node)
      ) {
        setShowPopup(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showPopup]);

  const trimmedText = inputText.trim();

  const handleSend = () => {
    if (!trimmedText || isLoading) {
      return;
    }

    onSend(trimmedText, pendingAttachments);
    setInputText("");
    setShowPopup(false);
  };

  return (
    <div className="relative flex flex-col gap-2">
      {pendingAttachments.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {pendingAttachments.map((attachment, index) => (
            <Badge
              key={`${attachment.type}-${attachment.value}-${index}`}
              variant="outline"
              className="flex items-center gap-1"
            >
              {attachment.label}
              <button
                type="button"
                aria-label={`${attachment.label} 제거`}
                onClick={() => {
                  const removed = pendingAttachments[index];
                  removeAttachment(index);
                  const remaining = pendingAttachments.filter(
                    (_, i) => i !== index,
                  );
                  if (removed.type === "color") {
                    setDesignContext({
                      colors: remaining
                        .filter((a) => a.type === "color")
                        .map((a) => a.value),
                    });
                  } else if (removed.type === "pattern") {
                    setDesignContext({ pattern: null });
                  }
                }}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}

      <div
        ref={popupWrapperRef}
        className="relative rounded-xl border bg-white p-2"
      >
        {showPopup ? (
          <AttachmentPopup onClose={() => setShowPopup(false)} />
        ) : null}
        <textarea
          rows={1}
          aria-label="디자인 요청 메시지"
          value={inputText}
          placeholder="원하는 넥타이 스타일을 자유롭게 입력하세요…"
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
          className="max-h-32 min-h-[40px] w-full resize-none border-0 bg-transparent px-2 py-1 text-sm outline-none"
        />
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="옵션 추가"
              aria-expanded={showPopup}
              aria-controls="attachment-popup"
              onClick={() => setShowPopup((prev) => !prev)}
            >
              <Plus
                className={`size-4 transition-transform duration-200 ${showPopup ? "rotate-45" : "rotate-0"}`}
              />
            </Button>
            <div
              role="radiogroup"
              className="inline-flex rounded-md border bg-muted p-0.5 gap-0.5"
            >
              {FABRIC_OPTIONS.map((option) => {
                const isSelected = designContext.fabricMethod === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    className={`rounded-sm px-3 py-1.5 text-xs font-medium transition-colors ${
                      isSelected
                        ? "bg-background text-foreground shadow-sm"
                        : "bg-transparent text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() =>
                      setDesignContext({
                        fabricMethod: option.value as FabricMethod,
                      })
                    }
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
          <Button
            type="button"
            size="icon"
            aria-label="메시지 전송"
            onClick={handleSend}
            disabled={!trimmedText || isLoading}
          >
            <Send className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
