import { MainContent, MainLayout } from "@/components/layout/main-layout";
import { VideoCard } from "./components/video-card";
import { NAVIGATION_ITEMS } from "@/constants/NAVIGATION_ITEMS";
import {
  Footer,
  FooterContent,
  FooterLink,
  FooterSection,
  FooterTitle,
} from "./components/footer";
import { VIDEO_DATA } from "./constants/VIDEO_DATA";

const HomePage = () => {
  return (
    <MainLayout>
      <MainContent>
        <div className="flex-1 min-h-screen flex items-center justify-center">
          <div className="w-full max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[70vh]">
              {VIDEO_DATA.map((video) => (
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
        <Footer>
          <FooterContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <FooterSection>
                <FooterTitle>서비스</FooterTitle>
                {NAVIGATION_ITEMS.map((item) => (
                  <FooterLink key={item.href} href={item.href}>
                    {item.label}
                  </FooterLink>
                ))}
              </FooterSection>
              <FooterSection>
                <FooterTitle>고객지원</FooterTitle>
                <FooterLink href="/faq">자주 묻는 질문</FooterLink>
                <FooterLink href="/contact">문의하기</FooterLink>
                <FooterLink href="/guide">이용 가이드</FooterLink>
              </FooterSection>
              <FooterSection>
                <FooterTitle>회사소개</FooterTitle>
                <FooterLink href="/about">회사 소개</FooterLink>
                <FooterLink href="/history">연혁</FooterLink>
                <FooterLink href="/location">찾아오시는 길</FooterLink>
              </FooterSection>
              <FooterSection>
                <FooterTitle>정책</FooterTitle>
                <FooterLink href="/privacy">개인정보처리방침</FooterLink>
                <FooterLink href="/terms">이용약관</FooterLink>
                <FooterLink href="/refund">환불정책</FooterLink>
              </FooterSection>
            </div>
            <div className="mt-12 pt-8 border-t border-gray-200">
              <p className="text-xs text-gray-500 text-center">
                2024 영선산업. All rights reserved.
              </p>
            </div>
          </FooterContent>
        </Footer>
      </MainContent>
    </MainLayout>
  );
};

export default HomePage;
