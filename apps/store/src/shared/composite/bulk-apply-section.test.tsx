import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const { error: toastError } = vi.hoisted(() => ({ error: vi.fn() }));
vi.mock("sonner", () => ({ toast: { error: toastError } }));

import BulkApplySection, {
  type BulkApplySectionRef,
} from "@/shared/composite/bulk-apply-section";
import { createRef } from "react";

const noop = vi.fn();

function setup() {
  const ref = createRef<BulkApplySectionRef>();
  render(
    <BulkApplySection ref={ref} setValue={noop} checkedIndices={[0, 1]} />,
  );
  return { ref };
}

describe("BulkApplySection", () => {
  describe("초기 렌더링", () => {
    it("초기에 측정 방식 탭이 보이지 않는다", () => {
      setup();
      expect(screen.queryByText("넥타이 길이")).not.toBeInTheDocument();
      expect(screen.queryByText("착용자 키")).not.toBeInTheDocument();
    });

    it("초기에 넥타이 길이 입력 필드가 보이지 않는다", () => {
      setup();
      expect(screen.queryByPlaceholderText("예: 51")).not.toBeInTheDocument();
    });

    it("초기에 원하는 폭 입력 필드가 보이지 않는다", () => {
      setup();
      expect(screen.queryByPlaceholderText("예: 9")).not.toBeInTheDocument();
    });
  });

  describe("자동수선 선택", () => {
    it("자동수선 카드 클릭 시 측정 방식 탭이 나타난다", async () => {
      const user = userEvent.setup();
      setup();

      await user.click(screen.getByRole("button", { name: /자동수선/ }));

      expect(screen.getByText("넥타이 길이")).toBeInTheDocument();
      expect(screen.getByText("착용자 키")).toBeInTheDocument();
    });

    it("자동수선 카드 클릭 시 넥타이 길이 입력 필드가 나타난다", async () => {
      const user = userEvent.setup();
      setup();

      await user.click(screen.getByRole("button", { name: /자동수선/ }));

      expect(screen.getByPlaceholderText("예: 51")).toBeInTheDocument();
    });
  });

  describe("폭수선만 선택", () => {
    it("폭수선 카드 클릭 시 측정 방식 탭이 나타나지 않는다", async () => {
      const user = userEvent.setup();
      setup();

      await user.click(screen.getByRole("button", { name: /폭수선/ }));

      expect(screen.queryByText("넥타이 길이")).not.toBeInTheDocument();
      expect(screen.queryByText("착용자 키")).not.toBeInTheDocument();
    });

    it("폭수선 카드 클릭 시 원하는 폭 입력 필드가 나타난다", async () => {
      const user = userEvent.setup();
      setup();

      await user.click(screen.getByRole("button", { name: /폭수선/ }));

      expect(screen.getByPlaceholderText("예: 9")).toBeInTheDocument();
    });
  });

  describe("handleBulkApply 검증", () => {
    it("서비스 미선택 시 에러 토스트를 표시하고 false를 반환한다", async () => {
      const { ref } = setup();

      if (!ref.current) throw new Error("ref should be mounted");
      const result = await ref.current.handleBulkApply();

      expect(toastError).toHaveBeenCalledWith(
        "수선 서비스를 하나 이상 선택해주세요.",
      );
      expect(result).toBe(false);
    });

    it("자동수선 선택 후 값 미입력 시 에러 토스트를 표시하고 false를 반환한다", async () => {
      const user = userEvent.setup();
      const { ref } = setup();

      await user.click(screen.getByRole("button", { name: /자동수선/ }));
      if (!ref.current) throw new Error("ref should be mounted");
      const result = await ref.current.handleBulkApply();

      expect(toastError).toHaveBeenCalledWith("측정 값을 입력해주세요.");
      expect(result).toBe(false);
    });

    it("폭수선 선택 후 값 미입력 시 에러 토스트를 표시하고 false를 반환한다", async () => {
      const user = userEvent.setup();
      const { ref } = setup();

      await user.click(screen.getByRole("button", { name: /폭수선/ }));
      if (!ref.current) throw new Error("ref should be mounted");
      const result = await ref.current.handleBulkApply();

      expect(toastError).toHaveBeenCalledWith("원하는 폭을 입력해주세요.");
      expect(result).toBe(false);
    });

    it("폭수선만 선택 후 값 입력 시 자동수선 관련 setValue를 호출하지 않는다", async () => {
      const user = userEvent.setup();
      const setValue = vi.fn();
      const ref = createRef<BulkApplySectionRef>();
      render(
        <BulkApplySection ref={ref} setValue={setValue} checkedIndices={[0]} />,
      );

      await user.click(screen.getByRole("button", { name: /폭수선/ }));
      await user.type(screen.getByPlaceholderText("예: 9"), "9");
      if (!ref.current) throw new Error("ref should be mounted");
      await ref.current.handleBulkApply();

      const calledKeys = setValue.mock.calls.map(([key]) => key);
      expect(calledKeys).not.toContain("ties.0.hasLengthReform");
      expect(calledKeys).not.toContain("ties.0.measurementType");
      expect(calledKeys).toContain("ties.0.hasWidthReform");
      expect(calledKeys).toContain("ties.0.targetWidth");
    });
  });
});
