import { TieMask } from "@/features/design/components/preview/tie-mask";

interface TiePreviewModalProps {
  imageUrl: string;
  onClose: () => void;
}

export function TiePreviewModal({ imageUrl, onClose }: TiePreviewModalProps) {
  return (
    <div
      data-testid="tie-preview-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={onClose}
    >
      <div data-testid="tie-preview-container">
        <TieMask
          imageUrl={imageUrl}
          width={256}
          height={488}
          shadowClassName="top-[-46px]"
        />
      </div>
    </div>
  );
}
