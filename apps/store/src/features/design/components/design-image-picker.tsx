import { useEffect, useMemo, useState } from "react";
import { Check, ImageOff, Loader2, Sparkles } from "lucide-react";
import type { UploadedImage } from "@/entities/custom-order";
import { useDesignImagesQuery } from "@/features/design/hooks/use-design-images-query";
import { cn } from "@/shared/lib/utils";
import { useAuthStore } from "@/shared/store/auth";
import { useLoginConfirm } from "@/shared/hooks/use-login-confirm";
import { Button } from "@/shared/ui-extended/button";
import { Dialog } from "@/shared/ui-extended/dialog";
import { ResponsiveDialogScaffold } from "@/shared/ui-extended/responsive-dialog-scaffold";

const DATE_FORMATTER = new Intl.DateTimeFormat("ko-KR", {
  month: "2-digit",
  day: "2-digit",
});

function formatCreatedAt(createdAt?: string) {
  if (!createdAt) return null;

  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return DATE_FORMATTER.format(date);
}

function getImageId(img: { imageFileId: string | null; imageUrl: string }) {
  return img.imageFileId ?? img.imageUrl;
}

interface DesignImagePickerProps {
  onAdd: (images: UploadedImage[]) => void;
}

export function DesignImagePicker({ onAdd }: DesignImagePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { user } = useAuthStore();
  const confirmLogin = useLoginConfirm();
  const [sentinelNode, setSentinelNode] = useState<HTMLDivElement | null>(null);
  const pageSize = 24;

  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useDesignImagesQuery(pageSize, { enabled: isOpen });

  const images = useMemo(
    () => data?.pages.flatMap((page) => page.images) ?? [],
    [data],
  );
  useEffect(() => {
    if (!isOpen || !hasNextPage || isFetchingNextPage) return;

    if (!sentinelNode) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        fetchNextPage();
      }
    });

    observer.observe(sentinelNode);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, isOpen, sentinelNode]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleAdd = () => {
    const selected = images.filter((img) => selectedIds.has(getImageId(img)));
    onAdd(
      selected.map((img) => {
        const formattedCreatedAt = formatCreatedAt(img.createdAt);

        return {
          url: img.imageUrl,
          fileId: img.imageFileId ?? img.imageUrl,
          name: formattedCreatedAt
            ? `AI 디자인 ${formattedCreatedAt}`
            : "AI 디자인",
        };
      }),
    );
    setSelectedIds(new Set());
    setIsOpen(false);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setSelectedIds(new Set());
    }
  };

  const handleCancel = () => {
    handleOpenChange(false);
  };

  const content = (
    <>
      {isLoading ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square animate-pulse rounded-md bg-muted"
            />
          ))}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <p className="text-sm text-foreground-muted">
            이미지를 불러오지 못했습니다.
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="text-xs text-foreground-muted underline underline-offset-4"
          >
            다시 시도
          </button>
        </div>
      ) : images.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <ImageOff className="size-8 text-foreground-muted/40" />
          <p className="text-sm text-foreground-muted">
            아직 생성한 이미지가 없어요
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {images.map((img) => {
            const imageId = getImageId(img);
            const isSelected = selectedIds.has(imageId);

            return (
              <button
                key={imageId}
                type="button"
                aria-pressed={isSelected}
                aria-label={img.sessionFirstMessage || "AI 디자인 이미지"}
                onClick={() => toggleSelect(imageId)}
                className={cn(
                  "relative aspect-square overflow-hidden rounded-md border-2 transition-all",
                  isSelected
                    ? "border-foreground shadow-[0_0_0_1px_theme(colors.foreground)]"
                    : "border-border hover:border-foreground/30",
                )}
              >
                <img
                  src={img.imageUrl}
                  alt={img.sessionFirstMessage}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
                {isSelected && (
                  <span className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-foreground text-background">
                    <Check className="size-3" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {hasNextPage ? (
        <div
          ref={setSentinelNode}
          className="flex h-12 items-center justify-center"
        >
          {isFetchingNextPage ? (
            <Loader2 className="size-4 animate-spin text-foreground-muted" />
          ) : null}
        </div>
      ) : null}
    </>
  );

  const handleTriggerClick = () => {
    if (!user) {
      confirmLogin();
      return;
    }
    setIsOpen(true);
  };

  const trigger = (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleTriggerClick}
    >
      <Sparkles className="size-3.5" />내 AI 디자인에서 선택
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {trigger}
      <ResponsiveDialogScaffold
        title="AI 디자인"
        confirmDisabled={selectedIds.size === 0}
        confirmLabel={
          selectedIds.size > 0
            ? `${selectedIds.size}장 추가`
            : "선택한 이미지 추가"
        }
        onCancel={handleCancel}
        onConfirm={handleAdd}
      >
        {content}
      </ResponsiveDialogScaffold>
    </Dialog>
  );
}
