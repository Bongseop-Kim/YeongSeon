import { useState } from "react";
import { ChevronDown, ChevronUp, ImageOff } from "lucide-react";
import type { UploadedImage } from "@/entities/custom-order";
import { useDesignImagesQuery } from "@/features/design/hooks/use-design-images-query";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui-extended/button";

const DATE_FORMATTER = new Intl.DateTimeFormat("ko-KR", {
  month: "2-digit",
  day: "2-digit",
});

interface DesignImagePickerProps {
  onAdd: (images: UploadedImage[]) => void;
}

export function DesignImagePicker({ onAdd }: DesignImagePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const pageSize = 12;

  const { data, isLoading, isError, refetch } = useDesignImagesQuery(
    page,
    pageSize,
  );
  const images = data?.images ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);
  const pageWindowStart = Math.max(1, page - 2);
  const pageWindowEnd = Math.min(totalPages, page + 2);
  const visiblePages = Array.from(
    { length: pageWindowEnd - pageWindowStart + 1 },
    (_, index) => pageWindowStart + index,
  );

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    setSelectedIds(new Set());
  };

  const toggleSelect = (fileId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(fileId)) {
        next.delete(fileId);
      } else {
        next.add(fileId);
      }
      return next;
    });
  };

  const handleAdd = () => {
    const selected = images.filter((img) => selectedIds.has(img.imageFileId));
    onAdd(
      selected.map((img) => ({
        url: img.imageUrl,
        fileId: img.imageFileId,
        name: `AI 디자인 ${DATE_FORMATTER.format(new Date(img.createdAt))}`,
      })),
    );
    setSelectedIds(new Set());
    setIsOpen(false);
  };

  const handleCancel = () => {
    setSelectedIds(new Set());
    setIsOpen(false);
  };

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-background">
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm text-foreground-muted transition-colors hover:bg-muted"
      >
        <span className="flex items-center gap-2">
          <span className="font-medium">내 AI 디자인에서 선택</span>
          {total > 0 && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-foreground-muted">
              {total}장
            </span>
          )}
        </span>
        {isOpen ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>

      {isOpen && (
        <div className="space-y-4 border-t border-border p-4">
          {selectedIds.size > 0 && (
            <p className="rounded-md border border-success/20 bg-success-muted px-3 py-2 text-xs text-success">
              {selectedIds.size}장 선택됨 — 추가 버튼을 누르면 참고 이미지에
              추가됩니다.
            </p>
          )}

          {isLoading ? (
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: pageSize }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square animate-pulse rounded-md bg-muted"
                />
              ))}
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
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
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <ImageOff className="h-8 w-8 text-foreground-muted/40" />
              <p className="text-sm text-foreground-muted">
                아직 생성한 이미지가 없어요
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {images.map((img) => {
                const isSelected = selectedIds.has(img.imageFileId);
                return (
                  <button
                    key={img.imageFileId}
                    type="button"
                    aria-pressed={isSelected}
                    aria-label={img.sessionFirstMessage || "AI 디자인 이미지"}
                    onClick={() => toggleSelect(img.imageFileId)}
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
                      <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-foreground text-[9px] text-background">
                        ✓
                      </span>
                    )}
                    <span className="absolute bottom-0 left-0 right-0 bg-foreground/70 px-1 py-0.5 text-[10px] text-background">
                      {DATE_FORMATTER.format(new Date(img.createdAt))}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1">
              <button
                type="button"
                onClick={() => handlePageChange(Math.max(1, page - 1))}
                disabled={page === 1}
                className="rounded px-2 py-1 text-xs text-foreground-muted transition-colors hover:bg-muted disabled:opacity-30"
              >
                이전
              </button>
              {pageWindowStart > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={() => handlePageChange(1)}
                    className={cn(
                      "rounded px-2 py-1 text-xs",
                      page === 1
                        ? "bg-foreground text-background"
                        : "text-foreground-muted hover:bg-muted",
                    )}
                  >
                    1
                  </button>
                  {pageWindowStart > 2 ? (
                    <span className="px-1 text-xs text-foreground-muted">
                      ...
                    </span>
                  ) : null}
                </>
              ) : null}
              {visiblePages.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handlePageChange(p)}
                  className={cn(
                    "rounded px-2 py-1 text-xs",
                    p === page
                      ? "bg-foreground text-background"
                      : "text-foreground-muted hover:bg-muted",
                  )}
                >
                  {p}
                </button>
              ))}
              {pageWindowEnd < totalPages ? (
                <>
                  {pageWindowEnd < totalPages - 1 ? (
                    <span className="px-1 text-xs text-foreground-muted">
                      ...
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => handlePageChange(totalPages)}
                    className={cn(
                      "rounded px-2 py-1 text-xs",
                      page === totalPages
                        ? "bg-foreground text-background"
                        : "text-foreground-muted hover:bg-muted",
                    )}
                  >
                    {totalPages}
                  </button>
                </>
              ) : null}
              <button
                type="button"
                onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="rounded px-2 py-1 text-xs text-foreground-muted transition-colors hover:bg-muted disabled:opacity-30"
              >
                다음
              </button>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCancel}
            >
              취소
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={selectedIds.size === 0}
              onClick={handleAdd}
            >
              {selectedIds.size > 0 ? `${selectedIds.size}장 추가` : "추가"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
