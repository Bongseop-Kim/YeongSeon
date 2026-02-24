import { useEffect, useRef } from "react";
import {
  useDaumPostcode,
  type DaumPostcodeData,
} from "@/features/shipping/hooks/useDaumPostcode";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { PageTitle } from "@/components/layout/main-layout";
import CloseButton from "@/components/ui/close";

interface PostcodeSearchProps {
  onComplete: (data: DaumPostcodeData) => void;
  onClose?: () => void;
  isOpen: boolean;
}

export const PostcodeSearch = ({
  onComplete,
  onClose,
  isOpen,
}: PostcodeSearchProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { isLoaded } = useDaumPostcode();

  useEffect(() => {
    if (!isLoaded || !isOpen) return;

    const embedPostcode = () => {
      if (containerRef.current && window.daum?.Postcode) {
        containerRef.current.innerHTML = "";

        const postcode = new window.daum.Postcode({
          oncomplete: (data: DaumPostcodeData) => {
            onComplete(data);
          },
          width: "100%",
          height: "100%",
        });

        postcode.embed(containerRef.current);
      } else {
        setTimeout(embedPostcode, 100);
      }
    };

    // DOM 렌더링 완료를 기다리기 위해 setTimeout 사용
    setTimeout(embedPostcode, 0);
  }, [isLoaded, isOpen, onComplete]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        showCloseButton={false}
        className="max-w-lg w-full h-full rounded-none p-0 gap-0"
      >
        <div className="bg-zinc-100 px-2 flex items-center justify-between">
          <PageTitle>우편번호 검색</PageTitle>

          <CloseButton onRemove={() => onClose?.()} />
        </div>

        <div ref={containerRef} className="min-h-screen">
          {!isLoaded && (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-500">우편번호 검색 로딩 중...</div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
