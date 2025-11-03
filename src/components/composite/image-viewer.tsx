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
  ({ image, alt = "이미지 미리보기", onClose, className, ...props }, ref) => {
    const objectUrlRef = React.useRef<string | null>(null);
    const [imageSrc, setImageSrc] = React.useState<string>("");

    React.useEffect(() => {
      // Revoke previous object URL if it exists
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }

      // Create new object URL for File inputs
      if (image instanceof File) {
        const url = URL.createObjectURL(image);
        objectUrlRef.current = url;
        setImageSrc(url);
      } else if (typeof image === "string") {
        setImageSrc(image);
      }

      // Cleanup on unmount
      return () => {
        if (objectUrlRef.current) {
          URL.revokeObjectURL(objectUrlRef.current);
          objectUrlRef.current = null;
        }
      };
    }, [image]);

    if (!image) {
      return (
        <div
          className={cn(
            "flex items-center justify-center text-gray-500 w-[107px] h-[129px] border border-dashed border-gray-300",
            className
          )}
        >
          이미지가 없습니다
        </div>
      );
    }

    return (
      <div ref={ref} className={cn("relative", className)} {...props}>
        <div className="relative w-[107px] h-[129px] bg-zinc-50">
          <img
            src={imageSrc}
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
