import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { createProduct } from "@/test/fixtures";

import { CartRecommendationsCard } from "./cart-recommendations-card";

vi.mock("@imagekit/react", () => ({
  Image: ({
    alt,
    className,
    src,
  }: {
    alt: string;
    className?: string;
    src: string;
  }) => <img alt={alt} className={className} src={src} />,
}));

const renderRecommendations = (isMobile: boolean) => {
  const products = Array.from({ length: 8 }, (_, index) =>
    createProduct({
      id: index + 1,
      name: `추천 넥타이 ${index + 1}`,
      image: `https://example.com/tie-${index + 1}.jpg`,
    }),
  );

  render(
    <MemoryRouter>
      <CartRecommendationsCard products={products} isMobile={isMobile} />
    </MemoryRouter>,
  );
};

describe("CartRecommendationsCard", () => {
  it("모바일에서는 추천 상품을 6개만 렌더링한다", () => {
    renderRecommendations(true);

    expect(screen.getAllByRole("link")).toHaveLength(6);
    expect(screen.getByText("추천 넥타이 6")).toBeInTheDocument();
    expect(screen.queryByText("추천 넥타이 7")).not.toBeInTheDocument();
  });

  it("데스크톱에서는 전달받은 추천 상품을 모두 렌더링한다", () => {
    renderRecommendations(false);

    expect(screen.getAllByRole("link")).toHaveLength(8);
    expect(screen.getByText("추천 넥타이 8")).toBeInTheDocument();
  });
});
