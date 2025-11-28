import { Instagram } from "lucide-react";

const INSTAGRAM_IMAGES = [
  { id: 1, src: "/images/instagram-feed/1.png", alt: "Instagram post 1" },
  { id: 2, src: "/images/instagram-feed/2.png", alt: "Instagram post 2" },
  { id: 3, src: "/images/instagram-feed/3.png", alt: "Instagram post 3" },
  { id: 4, src: "/images/instagram-feed/4.png", alt: "Instagram post 4" },
  { id: 5, src: "/images/instagram-feed/5.png", alt: "Instagram post 5" },
  { id: 6, src: "/images/instagram-feed/6.png", alt: "Instagram post 6" },
  { id: 7, src: "/images/instagram-feed/7.png", alt: "Instagram post 7" },
  { id: 8, src: "/images/instagram-feed/8.png", alt: "Instagram post 8" },
  { id: 9, src: "/images/instagram-feed/9.png", alt: "Instagram post 9" },
  { id: 10, src: "/images/instagram-feed/10.png", alt: "Instagram post 10" },
  { id: 11, src: "/images/instagram-feed/11.png", alt: "Instagram post 11" },
  { id: 12, src: "/images/instagram-feed/12.png", alt: "Instagram post 12" },
  { id: 13, src: "/images/instagram-feed/13.png", alt: "Instagram post 13" },
  { id: 14, src: "/images/instagram-feed/14.png", alt: "Instagram post 14" },
  { id: 15, src: "/images/instagram-feed/15.png", alt: "Instagram post 15" },
  { id: 16, src: "/images/instagram-feed/16.png", alt: "Instagram post 16" },
];

export const InstagramFeed = () => {
  return (
    <section className="w-full py-12 px-4">
      <div>
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Instagram className="w-6 h-6" />
            <h2 className="text-2xl md:text-3xl font-bold">Instagram</h2>
          </div>
          <p className="text-zinc-600 dark:text-zinc-400">
            @yeongseong_official
          </p>
          <a
            href="https://www.instagram.com/yeongseong_official"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-4 text-sm font-medium text-zinc-900 dark:text-zinc-100 hover:underline"
          >
            팔로우하기 →
          </a>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-2 md:gap-4">
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
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                <Instagram className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};
