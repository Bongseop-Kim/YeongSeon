import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { createProduct } from "@/test/fixtures";

import { ProductCard } from "./product-card";

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

describe("ProductCard", () => {
  it("renders the shared card with the home product card presentation", () => {
    const product = createProduct({
      id: 12,
      name: "오브제 실크 넥타이",
      price: 38000,
      image: "https://example.com/tie.jpg",
      likes: 7,
      code: "YS-012",
      material: "silk",
    });

    const { container } = render(
      <MemoryRouter>
        <ProductCard product={product} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link")).toHaveAttribute("href", "/shop/12");
    expect(screen.getByRole("img", { name: "오브제 실크 넥타이" })).toHaveClass(
      "object-cover",
    );
    expect(screen.getByText("오브제 실크 넥타이")).toBeInTheDocument();
    expect(screen.getByText("38,000원")).toBeInTheDocument();
    expect(screen.getByText("좋아요 7")).toBeInTheDocument();
    expect(screen.queryByText("YS-012")).not.toBeInTheDocument();
    expect(container.querySelector(".aspect-square")).toBeInTheDocument();
  });
});
