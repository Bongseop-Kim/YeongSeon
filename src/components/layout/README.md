# Layout Components

shadcn/ui 스타일에 맞춰 제작된 레이아웃 컴포넌트들입니다.

## 컴포넌트 목록

### Container

반응형 컨테이너 컴포넌트

```tsx
import { Container } from "@/components/layout";

<Container size="xl" padding="md">
  Content here
</Container>;
```

### Header

상단 헤더 컴포넌트

```tsx
import {
  Header,
  HeaderContent,
  HeaderTitle,
  HeaderNav,
} from "@/components/layout";

<Header sticky>
  <HeaderContent>
    <HeaderTitle>My App</HeaderTitle>
    <HeaderNav>
      <a href="/">Home</a>
      <a href="/about">About</a>
    </HeaderNav>
  </HeaderContent>
</Header>;
```

### MainLayout

메인 레이아웃 컴포넌트

```tsx
import {
  MainLayout,
  MainContent,
  PageHeader,
  PageTitle,
  PageContent,
} from "@/components/layout";

<MainLayout layout="sidebar">
  <Sidebar />
  <MainContent>
    <PageHeader>
      <PageTitle>Dashboard</PageTitle>
    </PageHeader>
    <PageContent>Main content here</PageContent>
  </MainContent>
</MainLayout>;
```

### Footer

하단 푸터 컴포넌트

```tsx
import {
  Footer,
  FooterContent,
  FooterSection,
  FooterTitle,
  FooterLink,
} from "@/components/layout";

<Footer>
  <FooterContent>
    <FooterSection>
      <FooterTitle>Company</FooterTitle>
      <FooterLink href="/about">About</FooterLink>
      <FooterLink href="/contact">Contact</FooterLink>
    </FooterSection>
  </FooterContent>
</Footer>;
```

### Grid

그리드 레이아웃 컴포넌트

```tsx
import { Grid, GridItem } from "@/components/layout";

<Grid cols={3} gap={4}>
  <GridItem>Item 1</GridItem>
  <GridItem colSpan={2}>Item 2</GridItem>
</Grid>;
```

### Flex

플렉스 레이아웃 컴포넌트

```tsx
import { Flex, FlexItem } from "@/components/layout";

<Flex direction="row" align="center" justify="between" gap={4}>
  <FlexItem>Item 1</FlexItem>
  <FlexItem flex="1">Item 2</FlexItem>
</Flex>;
```

## 사용 예시

### 기본 앱 레이아웃

```tsx
import {
  MainLayout,
  Header,
  HeaderContent,
  HeaderTitle,
  MainContent,
  Container,
  Footer,
  FooterContent,
} from "@/components/layout";

export default function App() {
  return (
    <MainLayout>
      <Header>
        <HeaderContent>
          <HeaderTitle>My App</HeaderTitle>
        </HeaderContent>
      </Header>

      <MainContent>
        <Container>
          <h1>Welcome to My App</h1>
        </Container>
      </MainContent>

      <Footer>
        <FooterContent>
          <p>&copy; 2024 My App. All rights reserved.</p>
        </FooterContent>
      </Footer>
    </MainLayout>
  );
}
```
