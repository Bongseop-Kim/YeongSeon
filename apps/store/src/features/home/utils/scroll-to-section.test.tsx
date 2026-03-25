import type { MouseEvent } from "react";
import { describe, expect, it, vi } from "vitest";
import { scrollToSection } from "@/features/home/utils/scroll-to-section";

describe("scrollToSection", () => {
  it("hash가 '#'으로 시작하지 않으면 아무것도 하지 않는다", () => {
    const event = {
      preventDefault: vi.fn(),
    } as unknown as MouseEvent<HTMLAnchorElement>;
    scrollToSection("no-hash")(event);
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it("'#'만 있을 때는 아무것도 하지 않는다", () => {
    const event = {
      preventDefault: vi.fn(),
    } as unknown as MouseEvent<HTMLAnchorElement>;
    scrollToSection("#")(event);
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it("요소를 찾을 수 없으면 아무것도 하지 않는다", () => {
    vi.spyOn(document, "getElementById").mockReturnValueOnce(null);
    const event = {
      preventDefault: vi.fn(),
    } as unknown as MouseEvent<HTMLAnchorElement>;
    scrollToSection("#missing-section")(event);
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it("유효한 hash와 요소가 있을 때 스크롤 후 URL을 업데이트한다", () => {
    const mockElement = { scrollIntoView: vi.fn() } as unknown as HTMLElement;
    vi.spyOn(document, "getElementById").mockReturnValueOnce(mockElement);
    vi.spyOn(window.history, "replaceState").mockImplementation(vi.fn());

    const event = {
      preventDefault: vi.fn(),
    } as unknown as MouseEvent<HTMLAnchorElement>;
    scrollToSection("#section1")(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(mockElement.scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "start",
    });
    expect(window.history.replaceState).toHaveBeenCalledWith(
      null,
      "",
      "#section1",
    );
  });
});
