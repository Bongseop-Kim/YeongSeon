import { Image } from "@imagekit/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui-extended/button";
import { Label } from "@/components/ui/label";
import { formatDate } from "@yeongseon/shared/utils/format-date";
import {
  INQUIRY_STATUS,
  type InquiryItem,
} from "@/features/my-page/inquiry/types/inquiry-item";

interface InquiryCardProps {
  inquiry: InquiryItem;
  isMutating: boolean;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function InquiryCard({
  inquiry,
  isMutating,
  onEdit,
  onDelete,
}: InquiryCardProps) {
  const isPending = inquiry.status === INQUIRY_STATUS.PENDING;

  return (
    <article className="border-b border-stone-200 px-4 py-6 transition-colors hover:bg-stone-50/50 lg:px-0">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={
                  isPending
                    ? "border-amber-300 bg-amber-50 text-amber-700"
                    : "border-emerald-300 bg-emerald-50 text-emerald-700"
                }
              >
                {inquiry.status}
              </Badge>
              <span className="text-xs uppercase tracking-[0.18em] text-zinc-400">
                {inquiry.category}
              </span>
              <span className="text-xs text-zinc-400">
                접수일 {formatDate(inquiry.date)}
              </span>
            </div>
            <Label className="mt-3 block text-lg font-semibold leading-7 text-zinc-950">
              {inquiry.title}
            </Label>
          </div>

          {isPending && (
            <div className="flex shrink-0 gap-2 self-start">
              <Button
                variant="outline"
                size="sm"
                disabled={isMutating}
                onClick={() => onEdit(inquiry.id)}
              >
                수정
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={isMutating}
                onClick={() => onDelete(inquiry.id)}
              >
                삭제
              </Button>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          {inquiry.product && (
            <div className="flex items-center gap-3 border-l border-stone-300 pl-4 text-sm text-zinc-600">
              <Image
                src={inquiry.product.image}
                alt={inquiry.product.name}
                className="h-10 w-10 rounded-md object-cover"
                transformation={[{ width: 32, height: 32 }]}
              />
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">
                  관련 상품
                </p>
                <span className="text-sm text-zinc-700">
                  {inquiry.product.name}
                </span>
              </div>
            </div>
          )}
          <Label className="whitespace-pre-line text-sm leading-7 text-zinc-600">
            {inquiry.content}
          </Label>

          {inquiry.answer && (
            <div className="border-l border-stone-400 bg-stone-50/80 px-4 py-4">
              <Label className="mb-2 block text-xs uppercase tracking-[0.18em] text-zinc-500">
                {inquiry.answerDate
                  ? `답변 (${formatDate(inquiry.answerDate)})`
                  : "답변"}
              </Label>
              <Label className="whitespace-pre-line text-sm leading-7 text-zinc-700">
                {inquiry.answer}
              </Label>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
