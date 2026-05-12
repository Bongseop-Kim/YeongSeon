import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ChipSinglePicker } from "@/shared/composite/chip-single-picker";

const OPTIONS = [
  { label: "전체", value: "all" },
  { label: "제작", value: "custom" },
  { label: "수선", value: "reform" },
];

describe("ChipSinglePicker", () => {
  it("value에 해당하는 칩 하나만 선택 상태로 표시한다", () => {
    render(
      <ChipSinglePicker
        ariaLabel="주문 유형"
        options={OPTIONS}
        value="custom"
        onValueChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("radio", { name: "전체" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
    expect(screen.getByRole("radio", { name: "제작" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("radio", { name: "수선" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  it("다른 칩을 클릭하면 해당 value로 onValueChange를 호출한다", async () => {
    const onValueChange = vi.fn();
    render(
      <ChipSinglePicker
        ariaLabel="주문 유형"
        options={OPTIONS}
        value="all"
        onValueChange={onValueChange}
      />,
    );

    await userEvent.click(screen.getByRole("radio", { name: "수선" }));

    expect(onValueChange).toHaveBeenCalledWith("reform");
  });

  it("이미 선택된 칩을 다시 클릭해도 선택 해제 값을 전달하지 않는다", async () => {
    const onValueChange = vi.fn();
    render(
      <ChipSinglePicker
        ariaLabel="주문 유형"
        options={OPTIONS}
        value="all"
        onValueChange={onValueChange}
      />,
    );

    await userEvent.click(screen.getByRole("radio", { name: "전체" }));

    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("disabled=true이면 칩 클릭 시 onValueChange를 호출하지 않는다", async () => {
    const onValueChange = vi.fn();
    render(
      <ChipSinglePicker
        ariaLabel="주문 유형"
        options={OPTIONS}
        value="all"
        onValueChange={onValueChange}
        disabled
      />,
    );

    await userEvent.click(screen.getByRole("radio", { name: "제작" }));

    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("개별 option disabled이면 해당 칩 클릭 시 onValueChange를 호출하지 않는다", async () => {
    const onValueChange = vi.fn();
    render(
      <ChipSinglePicker
        ariaLabel="주문 유형"
        options={[
          { label: "전체", value: "all" },
          { label: "제작", value: "custom", disabled: true },
        ]}
        value="all"
        onValueChange={onValueChange}
      />,
    );

    await userEvent.click(screen.getByRole("radio", { name: "제작" }));

    expect(onValueChange).not.toHaveBeenCalled();
  });
});
