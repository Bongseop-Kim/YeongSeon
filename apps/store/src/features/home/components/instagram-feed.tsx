import { Instagram } from "lucide-react";
import { useBreakpoint } from "@/providers/breakpoint-provider";
import { INSTAGRAM_IMAGES } from "@/features/home/constants/INSTAGRAM_IMAGES";

export const InstagramFeed = () => {
  const { isMobile } = useBreakpoint();

  return (
    <section className="w-full py-12 px-4 max-w-7xl mx-auto">
      <div>
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Instagram className="w-6 h-6" />
            <h2 className={`font-bold ${isMobile ? "text-2xl" : "text-3xl"}`}>
              Instagram
            </h2>
          </div>
          <p className="text-zinc-600 dark:text-zinc-400">
            @yeongseong_official
          </p>
          <a
            href="https://www.instagram.com/yeongseong_official"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-4 text-sm font-medium text-zinc-900 dark:text-zinc-100"
          >
            팔로우하기 →
          </a>
        </div>

        {/* Grid */}
        <div
          className={`grid ${isMobile ? "grid-cols-2 gap-2" : "grid-cols-4 gap-4"}`}
        >
          {INSTAGRAM_IMAGES.map((image) => (
            <a
              key={image.id}
              href="https://www.instagram.com/yeongseong_official"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative aspect-square overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800"
            >
              <img
                src={image.src}
                alt={image.alt}
                className="w-full h-full object-cover transition-transform duration-300"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/0 transition-colors duration-300 flex items-center justify-center">
                <Instagram className="w-8 h-8 text-white opacity-0 transition-opacity duration-300" />
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};
