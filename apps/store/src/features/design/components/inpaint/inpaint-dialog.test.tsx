import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InpaintDialog } from "@/features/design/components/inpaint/inpaint-dialog";

const maskCanvasElement = document.createElement("canvas");
const rescaleMaskToTarget = vi.fn();
const canvasToPngBase64 = vi.fn();
const consoleError = vi.fn();

vi.mock("@/shared/ui-extended/dialog", () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/shared/ui-extended/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    type,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    type?: "button" | "submit" | "reset";
  }) => (
    <button type={type ?? "button"} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

vi.mock("@/shared/ui/field", () => ({
  Field: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  FieldContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  FieldDescription: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  FieldError: ({ errors }: { errors: Array<{ message?: string }> }) => (
    <div>{errors[0]?.message}</div>
  ),
  FieldLabel: ({
    children,
    htmlFor,
  }: {
    children: React.ReactNode;
    htmlFor?: string;
  }) => <label htmlFor={htmlFor}>{children}</label>,
  FieldTitle: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
}));

vi.mock("@/shared/ui/textarea", () => ({
  Textarea: ({
    value,
    onChange,
    placeholder,
    id,
  }: {
    value: string;
    onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
    placeholder?: string;
    id?: string;
  }) => (
    <textarea
      id={id}
      value={value}
      placeholder={placeholder}
      onChange={onChange}
    />
  ),
}));

vi.mock("@/features/design/components/inpaint/mask-canvas", () => ({
  MaskCanvas: ({
    onCommit,
    ref,
  }: {
    onCommit: (maskBase64: string) => void;
    ref?: React.Ref<HTMLCanvasElement | null>;
  }) => {
    if (typeof ref === "function") {
      ref(maskCanvasElement);
    } else if (ref && "current" in ref) {
      ref.current = maskCanvasElement;
    }

    return (
      <button type="button" onClick={() => onCommit("preview-mask-base64")}>
        commit-mask
      </button>
    );
  },
}));

vi.mock("@/features/design/lib/rescale-mask", () => ({
  MAX_MASK_BASE64_LENGTH: 5_000_000,
  rescaleMaskToTarget: (...args: unknown[]) => rescaleMaskToTarget(...args),
  canvasToPngBase64: (...args: unknown[]) => canvasToPngBase64(...args),
}));

describe("InpaintDialog", () => {
  beforeEach(() => {
    rescaleMaskToTarget.mockReset();
    canvasToPngBase64.mockReset();
    consoleError.mockReset();
    vi.spyOn(console, "error").mockImplementation(consoleError);
    vi.stubGlobal(
      "Image",
      class {
        naturalWidth = 2048;
        naturalHeight = 2048;
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;

        set src(_value: string) {
          this.onload?.();
        }
      } as typeof Image,
    );
  });

  it("리사이즈된 마스크가 제한을 넘으면 기존 preview mask를 전송한다", async () => {
    rescaleMaskToTarget.mockResolvedValue(maskCanvasElement);
    canvasToPngBase64.mockResolvedValue("x".repeat(5_000_001));
    const onSubmit = vi.fn();

    render(
      <InpaintDialog
        open
        imageUrl="https://example.com/base.png"
        isSubmitting={false}
        onOpenChange={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "commit-mask" }));
    fireEvent.change(
      screen.getByPlaceholderText("예: 이 부분만 자수 느낌으로 바꿔줘"),
      {
        target: { value: "이 부분만 수정" },
      },
    );
    fireEvent.click(screen.getByRole("button", { name: "수정하기" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        "preview-mask-base64",
        "이 부분만 수정",
      );
    });
  });

  it("리사이즈된 마스크가 제한 이하면 리사이즈 결과를 전송한다", async () => {
    rescaleMaskToTarget.mockResolvedValue(maskCanvasElement);
    canvasToPngBase64.mockResolvedValue("rescaled-mask");
    const onSubmit = vi.fn();

    render(
      <InpaintDialog
        open
        imageUrl="https://example.com/base.png"
        isSubmitting={false}
        onOpenChange={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "commit-mask" }));
    fireEvent.change(
      screen.getByPlaceholderText("예: 이 부분만 자수 느낌으로 바꿔줘"),
      {
        target: { value: "이 부분만 수정" },
      },
    );
    fireEvent.click(screen.getByRole("button", { name: "수정하기" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith("rescaled-mask", "이 부분만 수정");
    });
  });

  it("전체 해상도 마스크 생성 실패 시 에러를 남기고 preview mask로 폴백한다", async () => {
    rescaleMaskToTarget.mockRejectedValue(new Error("rescale_failed"));
    const onSubmit = vi.fn();

    render(
      <InpaintDialog
        open
        imageUrl="https://example.com/base.png"
        isSubmitting={false}
        onOpenChange={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "commit-mask" }));
    fireEvent.change(
      screen.getByPlaceholderText("예: 이 부분만 자수 느낌으로 바꿔줘"),
      {
        target: { value: "이 부분만 수정" },
      },
    );
    fireEvent.click(screen.getByRole("button", { name: "수정하기" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        "preview-mask-base64",
        "이 부분만 수정",
      );
    });
    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining("rescaleMaskToTarget"),
      expect.any(Error),
    );
    expect(
      screen.getByText(
        "Failed to generate full-resolution mask, using preview mask instead",
      ),
    ).toBeInTheDocument();
  });
});
