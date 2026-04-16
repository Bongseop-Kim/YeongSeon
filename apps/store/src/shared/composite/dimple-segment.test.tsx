import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DimpleSegment } from "@/shared/composite/dimple-segment";

describe("DimpleSegment", () => {
  it("value=false일 때 '기본' 버튼이 선택 상태(aria-checked=true)다", () => {
    render(<DimpleSegment value={false} onChange={vi.fn()} />);
    expect(screen.getByRole("radio", { name: "기본" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("radio", { name: "딤플" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  it("value=true일 때 '딤플' 버튼이 선택 상태(aria-checked=true)다", () => {
    render(<DimpleSegment value={true} onChange={vi.fn()} />);
    expect(screen.getByRole("radio", { name: "딤플" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("'딤플' 버튼 클릭 시 onChange(true)가 호출된다", async () => {
    const onChange = vi.fn();
    render(<DimpleSegment value={false} onChange={onChange} />);
    await userEvent.click(screen.getByRole("radio", { name: "딤플" }));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("'기본' 버튼 클릭 시 onChange(false)가 호출된다", async () => {
    const onChange = vi.fn();
    render(<DimpleSegment value={true} onChange={onChange} />);
    await userEvent.click(screen.getByRole("radio", { name: "기본" }));
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it("이미 선택된 버튼을 클릭하면 현재 값으로 onChange(false)가 호출된다", async () => {
    const onChange = vi.fn();
    render(<DimpleSegment value={false} onChange={onChange} />);
    await userEvent.click(screen.getByRole("radio", { name: "기본" }));
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it("disabled=true일 때 버튼을 클릭해도 onChange가 호출되지 않는다", async () => {
    const onChange = vi.fn();
    render(<DimpleSegment value={false} onChange={onChange} disabled />);
    await userEvent.click(screen.getByRole("radio", { name: "딤플" }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
