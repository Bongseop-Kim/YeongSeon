import type { ReactNode } from "react";

interface CheckoutAmountMetaProps {
  label: string;
  value: string;
  amount: number;
}

interface CheckoutOptionListProps {
  children: ReactNode;
}

interface CheckoutOptionRowProps {
  label: string;
  value: ReactNode;
}

interface CheckoutReferenceImage {
  fileId: string;
  url: string;
}

interface CheckoutReferenceImagesProps {
  imageRefs: CheckoutReferenceImage[];
}

interface CheckoutAdditionalNotesProps {
  notes: string | null | undefined;
}

interface CheckoutSupplementaryDetailsProps {
  imageRefs: CheckoutReferenceImage[];
  notes: string | null | undefined;
}

export interface CheckoutSummaryRow {
  id: string;
  label: string;
  value: string;
}

export function CheckoutAmountMeta({
  label,
  value,
  amount,
}: CheckoutAmountMetaProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-foreground-subtle">
      <span>
        {label} <span className="font-medium text-foreground">{value}</span>
      </span>
      <span className="text-border">/</span>
      <span>
        예상 결제{" "}
        <span className="font-medium text-foreground">
          {amount.toLocaleString()}원
        </span>
      </span>
    </div>
  );
}

export function CheckoutOptionList({ children }: CheckoutOptionListProps) {
  return (
    <div className="divide-y divide-border/70 border-y border-border py-2 text-sm">
      {children}
    </div>
  );
}

export function CheckoutOptionRow({ label, value }: CheckoutOptionRowProps) {
  return (
    <div className="flex items-center justify-between py-3">
      <span className="text-foreground-muted">{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}

export function CheckoutReferenceImages({
  imageRefs,
}: CheckoutReferenceImagesProps) {
  return (
    <div className="py-3">
      <span className="text-foreground-muted">참고 이미지</span>
      {imageRefs.length > 0 ? (
        <div className="mt-3 grid grid-cols-4 gap-2">
          {imageRefs.map((ref) => (
            <div
              key={ref.fileId}
              className="aspect-square overflow-hidden rounded-lg border border-border bg-surface-muted"
            >
              <img
                src={ref.url}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
          ))}
        </div>
      ) : (
        <span className="ml-4 text-foreground">없음</span>
      )}
    </div>
  );
}

export function CheckoutAdditionalNotes({
  notes,
}: CheckoutAdditionalNotesProps) {
  if (!notes) return null;

  return (
    <div className="py-3">
      <span className="text-foreground-muted">요청사항</span>
      <p className="mt-2 whitespace-pre-wrap text-foreground">{notes}</p>
    </div>
  );
}

export function CheckoutSupplementaryDetails({
  imageRefs,
  notes,
}: CheckoutSupplementaryDetailsProps) {
  return (
    <>
      <CheckoutReferenceImages imageRefs={imageRefs} />
      <CheckoutAdditionalNotes notes={notes} />
    </>
  );
}
