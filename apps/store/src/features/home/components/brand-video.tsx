export const BrandVideo = () => {
  return (
    <div className="w-full py-16 lg:py-24">
      <div className="px-4">
        <p className="text-center text-sm lg:text-base font-light tracking-wide text-zinc-600 leading-relaxed">
          minimal, magnetic, and made to be lived in.
          <br />
          Because beauty isn't forced.
          <br />
          It's the way you wear it.
        </p>
      </div>
      <div className="w-full lg:w-2/3 lg:mx-auto mt-12 lg:mt-16">
        <div className="aspect-[4/5] lg:aspect-video">
          <video
            className="w-full h-full object-cover"
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
          >
            <source src="/videos/home.mp4" type="video/mp4" />
            브라우저가 비디오를 지원하지 않습니다.
          </video>
        </div>
      </div>
    </div>
  );
};
