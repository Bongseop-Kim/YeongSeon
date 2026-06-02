import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminFilterTextField } from "@/components/AdminFilterControls";

const originalShowPickerDescriptor = Object.getOwnPropertyDescriptor(
  HTMLInputElement.prototype,
  "showPicker",
);

function mockShowPicker() {
  const showPicker = vi.fn();

  Object.defineProperty(HTMLInputElement.prototype, "showPicker", {
    configurable: true,
    value: showPicker,
  });

  return showPicker;
}

describe("AdminFilterTextField", () => {
  afterEach(() => {
    if (originalShowPickerDescriptor) {
      Object.defineProperty(
        HTMLInputElement.prototype,
        "showPicker",
        originalShowPickerDescriptor,
      );
    } else {
      Reflect.deleteProperty(HTMLInputElement.prototype, "showPicker");
    }

    vi.clearAllMocks();
  });

  it("date 필드를 클릭하면 브라우저 date picker를 연다", () => {
    const showPicker = mockShowPicker();

    render(
      <AdminFilterTextField
        label="종료일"
        inputProps={{ type: "date", name: "ended_at" }}
      />,
    );

    fireEvent.click(screen.getByLabelText("종료일"));

    expect(showPicker).toHaveBeenCalledTimes(1);
  });

  it("date 필드 클릭이 취소되면 브라우저 date picker를 열지 않는다", () => {
    const showPicker = mockShowPicker();

    render(
      <AdminFilterTextField
        label="종료일"
        inputProps={{
          type: "date",
          name: "ended_at",
          onClick: (event) => event.preventDefault(),
        }}
      />,
    );

    fireEvent.click(screen.getByLabelText("종료일"));

    expect(showPicker).not.toHaveBeenCalled();
  });
});
