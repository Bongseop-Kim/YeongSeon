import { MainContent, MainLayout } from "@/components/layout/main-layout";
import { NAVIGATION_ITEMS } from "@/constants/NAVIGATION_ITEMS";
import {
  Footer,
  FooterContent,
  FooterLink,
  FooterSection,
  FooterTitle,
} from "./components/footer";
import { Banner } from "./components/banner";
import { Recommended } from "./components/recommended";
import { NewArrivals } from "./components/new-arrivals";
import { InstagramFeed } from "./components/instagram-feed";

const HomePage = () => {
  return (
    <MainLayout>
      <MainContent>
        <Banner />
        <NewArrivals />
        <Recommended />
        <div className="w-full py-16 lg:py-24">
          <div className="max-w-3xl mx-auto px-4">
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
              >
                <source src="/videos/home.mp4" type="video/mp4" />
                브라우저가 비디오를 지원하지 않습니다.
              </video>
            </div>
          </div>
        </div>
        <InstagramFeed />
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
                2024 ESSE SION. All rights reserved.
              </p>
            </div>
          </FooterContent>
        </Footer>
      </MainContent>
    </MainLayout>
  );
};

export default HomePage;
