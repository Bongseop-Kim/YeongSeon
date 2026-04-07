import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { analytics } from "@/shared/lib/analytics";

describe("analytics", () => {
  let gtagMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    gtagMock = vi.fn();
    Object.defineProperty(window, "gtag", {
      value: gtagMock,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "gtag", {
      value: undefined,
      writable: true,
      configurable: true,
    });
  });

  describe("pageview", () => {
    it("gtag event page_view를 경로와 함께 호출한다", () => {
      analytics.pageview("/shop");
      expect(gtagMock).toHaveBeenCalledWith("event", "page_view", {
        page_path: "/shop",
        page_title: undefined,
      });
    });

    it("gtag가 없으면 에러 없이 무시한다", () => {
      Object.defineProperty(window, "gtag", {
        value: undefined,
        writable: true,
        configurable: true,
      });
      expect(() => analytics.pageview("/shop")).not.toThrow();
    });
  });

  describe("track", () => {
    it("gtag event를 이벤트명과 파라미터로 호출한다", () => {
      analytics.track("add_to_cart", {
        item_id: "1",
        item_name: "클래식 타이",
        quantity: 2,
      });
      expect(gtagMock).toHaveBeenCalledWith("event", "add_to_cart", {
        item_id: "1",
        item_name: "클래식 타이",
        quantity: 2,
      });
    });

    it("gtag가 없으면 에러 없이 무시한다", () => {
      Object.defineProperty(window, "gtag", {
        value: undefined,
        writable: true,
        configurable: true,
      });
      expect(() => analytics.track("login", {})).not.toThrow();
    });
  });
});
