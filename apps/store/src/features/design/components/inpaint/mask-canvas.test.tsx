import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MaskCanvas } from "@/features/design/components/inpaint/mask-canvas";

describe("MaskCanvas", () => {
  beforeEach(() => {
    const context = {
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      clearRect: vi.fn(),
      drawImage: vi.fn(),
      fillRect: vi.fn(),
      globalCompositeOperation: "source-over",
      lineCap: "round",
      lineJoin: "round",
      lineWidth: 24,
      strokeStyle: "#ffffff",
      globalAlpha: 1,
      fillStyle: "#ffffff",
    } as unknown as CanvasRenderingContext2D;

    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      context,
    );
    vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue(
      "data:image/png;base64,mask-preview",
    );
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(
      (callback) => {
        callback?.(new Blob(["mask"], { type: "image/png" }));
      },
    );
    vi.spyOn(
      HTMLCanvasElement.prototype,
      "getBoundingClientRect",
    ).mockReturnValue({
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      top: 0,
      left: 0,
      right: 100,
      bottom: 100,
      toJSON: () => ({}),
    } as DOMRect);
    Object.defineProperty(HTMLCanvasElement.prototype, "setPointerCapture", {
      configurable: true,
      value: vi.fn(),
    });
  });

  it("pointer draw 후 마스크를 base64로 커밋한다", async () => {
    const onCommit = vi.fn();

    render(
      <MaskCanvas
        baseImageUrl="https://example.com/base.png"
        width={100}
        height={100}
        onCommit={onCommit}
      />,
    );

    const targetCanvas = document.querySelector("canvas");
    if (!(targetCanvas instanceof HTMLCanvasElement)) {
      throw new Error("canvas not found");
    }

    fireEvent.pointerDown(targetCanvas, {
      clientX: 10,
      clientY: 10,
      pointerId: 1,
    });
    fireEvent.pointerMove(targetCanvas, {
      clientX: 40,
      clientY: 40,
      pointerId: 1,
    });
    fireEvent.pointerUp(targetCanvas, {
      clientX: 40,
      clientY: 40,
      pointerId: 1,
    });

    fireEvent.click(screen.getByRole("button", { name: "마스크 반영" }));

    await waitFor(() => {
      expect(onCommit).toHaveBeenCalledWith(expect.any(String), "image/png");
    });
    expect((onCommit.mock.calls[0]?.[0] as string).length).toBeGreaterThan(0);
  });
});
