import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageViewerProps {
  image: string | File;
  alt?: string;
  onClose?: () => void;
  className?: string;
}

export const ImageViewer = React.forwardRef<HTMLDivElement, ImageViewerProps>(
  (
    {
      image,
      alt = "이미지 미리보기",
      onClose,
      className,
      ...props
    },
    ref
  ) => {
    const getImageSrc = (img: string | File) => {
      if (typeof img === 'string') {
        return img;
      }
      return URL.createObjectURL(img);
    };

    if (!image) {
      return (
        <div className={cn("flex items-center justify-center text-gray-500 w-[107px] h-[129px] border border-dashed border-gray-300", className)}>
          이미지가 없습니다
        </div>
      );
    }

    return (
      <div ref={ref} className={cn("relative", className)} {...props}>
        <div className="relative w-[107px] h-[129px] bg-stone-50">
          <img
            src={getImageSrc(image)}
            alt={alt}
            className="w-full h-full object-cover"
          />

          {/* Close Button */}
          {onClose && (
            <button
              type="button"
              className="absolute top-1 right-1 bg-black rounded-full w-4 h-4 flex items-center justify-center"
              onClick={onClose}
            >
              <X className="size-3" color="white" />
            </button>
          )}
        </div>
      </div>
    );
  }
);

ImageViewer.displayName = "ImageViewer";