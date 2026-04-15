import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DimpleSegment } from "@/shared/composite/dimple-segment";

describe("DimpleSegment", () => {
  it("value=false일 때 '기본' 버튼이 선택 상태(aria-pressed=true)다", () => {
    render(<DimpleSegment value={false} onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "기본" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "딤플" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("value=true일 때 '딤플' 버튼이 선택 상태(aria-pressed=true)다", () => {
    render(<DimpleSegment value={true} onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "딤플" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("'딤플' 버튼 클릭 시 onChange(true)가 호출된다", async () => {
    const onChange = vi.fn();
    render(<DimpleSegment value={false} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "딤플" }));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("'기본' 버튼 클릭 시 onChange(false)가 호출된다", async () => {
    const onChange = vi.fn();
    render(<DimpleSegment value={true} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "기본" }));
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it("이미 선택된 버튼을 클릭해도 onChange가 호출되지 않는다", async () => {
    const onChange = vi.fn();
    render(<DimpleSegment value={false} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "기본" }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("disabled=true일 때 버튼을 클릭해도 onChange가 호출되지 않는다", async () => {
    const onChange = vi.fn();
    render(<DimpleSegment value={false} onChange={onChange} disabled />);
    await userEvent.click(screen.getByRole("button", { name: "딤플" }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
