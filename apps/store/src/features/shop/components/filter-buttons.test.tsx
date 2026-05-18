import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FilterButtons } from "@/features/shop/components/filter-buttons";

describe("FilterButtons", () => {
  it("renders the desktop toolbar labels with active filter counts", () => {
    render(
      <FilterButtons
        onFilterClick={vi.fn()}
        onMainButtonClick={vi.fn()}
        activeCounts={{ price: 1, color: 2 }}
      />,
    );

    expect(screen.getByRole("button", { name: /전체 필터/ })).toHaveClass(
      "border!",
      "border-zinc-200!",
    );
    expect(screen.getByRole("button", { name: /가격 1/ })).toHaveClass(
      "bg-zinc-900",
      "border-zinc-900!",
    );
    expect(screen.getByRole("button", { name: /색상 2/ })).toHaveClass(
      "bg-zinc-900",
      "border-zinc-900!",
    );
  });

  it("calls reset from the toolbar reset action", async () => {
    const onReset = vi.fn();

    render(
      <FilterButtons
        onFilterClick={vi.fn()}
        onMainButtonClick={vi.fn()}
        activeCounts={{ price: 1 }}
        onReset={onReset}
      />,
    );

    const resetButton = screen.getByRole("button", { name: "초기화" });
    expect(resetButton.querySelector("svg")).not.toBeInTheDocument();

    await userEvent.click(resetButton);

    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it("hides reset when no filters are active", () => {
    render(
      <FilterButtons
        onFilterClick={vi.fn()}
        onMainButtonClick={vi.fn()}
        activeCounts={{}}
        onReset={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "초기화" }),
    ).not.toBeInTheDocument();
  });

  it("keeps reset visible when using a custom main button", () => {
    render(
      <FilterButtons
        onFilterClick={vi.fn()}
        mainButton={<button type="button">전체 필터</button>}
        activeCounts={{ price: 1 }}
        onReset={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "전체 필터" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "초기화" })).toBeInTheDocument();
  });
});
