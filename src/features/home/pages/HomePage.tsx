import { MainLayout, MainContent } from "@/components/layout";
import Video from "@/assets/videos/silk1.mp4";
import Video2 from "@/assets/videos/silk2.mp4";
import Video3 from "@/assets/videos/silk3.mp4";
import { VideoCard } from "../components/video-card";

// 영상 데이터
const videoData = [
  {
    videoSrc: Video,
    title: "디자인하기",
    description: "나만의 특별한 디자인을 만들어보세요",
    href: "/design",
  },
  {
    videoSrc: Video2,
    title: "맞춤 주문",
    description: "고객님의 요구에 맞춘 제품을 주문하세요",
    href: "/order",
  },
  {
    videoSrc: Video3,
    title: "수선 서비스",
    description: "전문적인 수선 서비스를 받아보세요",
    href: "/repair",
  },
];

const HomePage = () => {
  return (
    <MainLayout>
      <MainContent>
        <div className="flex-1 min-h-screen flex items-center justify-center">
          <div className="w-full max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[70vh]">
              {videoData.map((video) => (
                <VideoCard
                  key={video.href}
                  videoSrc={video.videoSrc}
                  title={video.title}
                  description={video.description}
                  href={video.href}
                />
              ))}
            </div>
          </div>
        </div>
      </MainContent>
    </MainLayout>
  );
};

export default HomePage;
