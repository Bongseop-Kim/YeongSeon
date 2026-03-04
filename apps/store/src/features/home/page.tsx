import { MainContent, MainLayout } from "@/components/layout/main-layout";
import { HomeContent } from "./components/home-content";

const HomePage = () => {
  return (
    <MainLayout>
      <MainContent>
        <HomeContent />
      </MainContent>
    </MainLayout>
  );
};

export default HomePage;
