import React from "react";

interface VideoCardProps {
  videoSrc: string;
  title: string;
  description: string;
  href: string;
}

export const VideoCard: React.FC<VideoCardProps> = ({
  videoSrc,
  title,
  description,
  href,
}) => {
  return (
    <div
      className="group cursor-pointer rounded-xl overflow-hidden shadow-2xl hover:shadow-3xl transition-all duration-300 ease-in-out transform hover:scale-[1.02] bg-gray-100"
      onClick={() => (window.location.href = href)}
    >
      <div className="relative h-full">
        <video
          className="w-full h-full object-cover"
          autoPlay
          loop
          muted
          playsInline
        >
          <source src={videoSrc} type="video/mp4" />
          브라우저가 비디오를 지원하지 않습니다.
        </video>
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent transition-all duration-300">
          <div className="absolute bottom-8 left-8 text-white">
            <h3 className="text-3xl font-bold mb-3">{title}</h3>
            <p className="text-lg opacity-90 leading-relaxed">{description}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
