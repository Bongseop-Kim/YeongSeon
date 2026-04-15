import { createRef } from "react";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import BulkApplySection, {
  type BulkApplySectionRef,
} from "@/shared/composite/bulk-apply-section";

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
    it("착용자 키 입력 필드가 항상 보인다", () => {
      setup();
      expect(screen.getByPlaceholderText("예: 175")).toBeInTheDocument();
    });

    it("원하는 폭 입력 필드가 항상 보인다", () => {
      setup();
      expect(screen.getByPlaceholderText("예: 9")).toBeInTheDocument();
    });

    it("초기에 기본/딤플 세그먼트가 비활성화 상태로 보인다", () => {
      setup();
      expect(screen.getByRole("button", { name: "기본" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "딤플" })).toBeDisabled();
    });

    it("초기에 required 표시(*)가 없다", () => {
      setup();
      expect(screen.queryByText("*")).not.toBeInTheDocument();
    });
  });

  describe("자동수선 선택", () => {
    it("자동수선 체크 시 기본/딤플 세그먼트가 나타난다", async () => {
      const user = userEvent.setup();
      setup();

      await user.click(screen.getByRole("checkbox", { name: /자동수선/ }));

      expect(screen.getByRole("button", { name: "기본" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "딤플" })).toBeInTheDocument();
    });

    it("자동수선 체크 시 착용자 키 required 표시(*)가 나타난다", async () => {
      const user = userEvent.setup();
      setup();

      await user.click(screen.getByRole("checkbox", { name: /자동수선/ }));

      expect(screen.getByText("*")).toBeInTheDocument();
    });

    it("자동수선 해제 시 기본/딤플 세그먼트가 다시 비활성화된다", async () => {
      const user = userEvent.setup();
      setup();

      await user.click(screen.getByRole("checkbox", { name: /자동수선/ }));
      await user.click(screen.getByRole("checkbox", { name: /자동수선/ }));

      expect(screen.getByRole("button", { name: "기본" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "딤플" })).toBeDisabled();
    });
  });

  describe("handleBulkApply 검증", () => {
    it("서비스 미선택 시 인라인 에러를 표시하고 false를 반환한다", async () => {
      const { ref } = setup();

      if (!ref.current) throw new Error("ref should be mounted");
      const current = ref.current;
      let result: boolean | Promise<boolean> = false;
      await act(async () => {
        result = await current.handleBulkApply();
      });

      expect(
        screen.getByText("수선 서비스를 하나 이상 선택해주세요."),
      ).toBeInTheDocument();
      expect(result).toBe(false);
    });

    it("자동수선 선택 후 값 미입력 시 착용자 키 인라인 에러를 표시하고 false를 반환한다", async () => {
      const user = userEvent.setup();
      const { ref } = setup();

      await user.click(screen.getByRole("checkbox", { name: /자동수선/ }));
      if (!ref.current) throw new Error("ref should be mounted");
      const current = ref.current;
      let result: boolean | Promise<boolean> = false;
      await act(async () => {
        result = await current.handleBulkApply();
      });

      expect(screen.getByText("착용자 키를 입력해주세요")).toBeInTheDocument();
      expect(result).toBe(false);
    });

    it("폭수선 선택 후 값 미입력 시 원하는 폭 인라인 에러를 표시하고 false를 반환한다", async () => {
      const user = userEvent.setup();
      const { ref } = setup();

      await user.click(screen.getByRole("checkbox", { name: /폭수선/ }));
      if (!ref.current) throw new Error("ref should be mounted");
      const current = ref.current;
      let result: boolean | Promise<boolean> = false;
      await act(async () => {
        result = await current.handleBulkApply();
      });

      expect(screen.getByText("원하는 폭을 입력해주세요")).toBeInTheDocument();
      expect(result).toBe(false);
    });

    it("폭수선만 선택 후 값 입력 시 자동수선 관련 setValue를 호출하지 않는다", async () => {
      const user = userEvent.setup();
      const setValue = vi.fn();
      const ref = createRef<BulkApplySectionRef>();
      render(
        <BulkApplySection ref={ref} setValue={setValue} checkedIndices={[0]} />,
      );

      await user.click(screen.getByRole("checkbox", { name: /폭수선/ }));
      await user.type(screen.getByPlaceholderText("예: 9"), "9");
      if (!ref.current) throw new Error("ref should be mounted");
      const current = ref.current;
      await act(async () => {
        await current.handleBulkApply();
      });

      const calledKeys = setValue.mock.calls.map(([key]) => key);
      expect(calledKeys).not.toContain("ties.0.hasLengthReform");
      expect(calledKeys).not.toContain("ties.0.measurementType");
      expect(calledKeys).toContain("ties.0.hasWidthReform");
      expect(calledKeys).toContain("ties.0.targetWidth");
    });

    it("자동수선 + 딤플 선택 후 적용 시 dimple이 true로 설정된다", async () => {
      const user = userEvent.setup();
      const setValue = vi.fn();
      const ref = createRef<BulkApplySectionRef>();
      render(
        <BulkApplySection ref={ref} setValue={setValue} checkedIndices={[0]} />,
      );

      await user.click(screen.getByRole("checkbox", { name: /자동수선/ }));
      await user.click(screen.getByRole("button", { name: "딤플" }));
      await user.type(screen.getByPlaceholderText("예: 175"), "175");
      if (!ref.current) throw new Error("ref should be mounted");
      const current = ref.current;
      await act(async () => {
        await current.handleBulkApply();
      });

      const dimpleCall = setValue.mock.calls.find(
        ([key]) => key === "ties.0.dimple",
      );
      expect(dimpleCall?.[1]).toBe(true);
    });
  });
});
