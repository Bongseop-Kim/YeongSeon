import {
  MainLayout,
  MainContent,
  Header,
  HeaderContent,
  HeaderTitle,
  Footer,
  FooterContent,
  Container,
  FooterSection,
  FooterTitle,
  FooterLink,
  HeaderNav,
} from "@/components/layout";

const HomePage = () => {
  return (
    <MainLayout>
      <Header>
        <HeaderContent>
          <HeaderTitle>My App</HeaderTitle>
          <HeaderNav>
            <a href="/">Home</a>
            <a href="/about">About</a>
          </HeaderNav>
        </HeaderContent>
      </Header>

      <MainContent>
        <Container>
          <h1>Welcome to My App</h1>
        </Container>
      </MainContent>

      <Footer>
        <FooterContent>
          <FooterSection>
            <FooterTitle>Company</FooterTitle>
            <FooterLink href="/about">About</FooterLink>
            <FooterLink href="/contact">Contact</FooterLink>
          </FooterSection>
        </FooterContent>
      </Footer>
    </MainLayout>
  );
};

export default HomePage;
