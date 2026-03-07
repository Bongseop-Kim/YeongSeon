import { useDesignChatStore } from "@/features/design/store/design-chat-store";
import { cn } from "@/lib/utils";

const tieMaskStyle = {
  maskImage: "url(/images/tie.svg)",
  maskSize: "contain",
  maskPosition: "center",
  maskRepeat: "no-repeat",
  WebkitMaskImage: "url(/images/tie.svg)",
  WebkitMaskSize: "contain",
  WebkitMaskPosition: "center",
  WebkitMaskRepeat: "no-repeat",
} as const;

interface TieCanvasProps {
  unmasked?: boolean;
}

export function TieCanvas({ unmasked = false }: TieCanvasProps) {
  const generationStatus = useDesignChatStore((state) => state.generationStatus);
  const generatedImageUrl = useDesignChatStore((state) => state.generatedImageUrl);
  const designContext = useDesignChatStore((state) => state.designContext);

  const isCompleted = generationStatus === "completed";
  const isLoading =
    generationStatus === "generating" || generationStatus === "regenerating";
  const previewColor = generatedImageUrl ?? designContext.colors[0] ?? "#e5e7eb";

  return (
    <div className="relative flex flex-col items-center">
      <div className="relative">
        {!unmasked && (
          <img
            src="/images/tieShadow.png"
            alt=""
            className="absolute top-[-57px] z-10 pointer-events-none"
          />
        )}
        <div
          className="relative flex h-[600px] w-[316px] items-center justify-center overflow-hidden"
          style={unmasked ? undefined : tieMaskStyle}
        >
          <div
            className={cn(
              "absolute inset-0 transition-opacity duration-500",
              isCompleted || unmasked ? "opacity-100" : "opacity-0",
            )}
            style={{ background: previewColor }}
          />
          {isLoading ? (
            <div className="animate-ai-shimmer absolute inset-0" />
          ) : null}
        </div>
      </div>
    </div>
  );
}
