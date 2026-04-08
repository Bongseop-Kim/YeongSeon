import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PendingResultBanner } from "@/features/design/components/chat/pending-result-banner";

describe("PendingResultBanner", () => {
  it("안내 문구와 두 버튼이 렌더링된다", () => {
    render(<PendingResultBanner onConfirm={vi.fn()} onDismiss={vi.fn()} />);
    expect(
      screen.getByText("이전 AI 디자인 생성 결과가 저장되었습니다."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "기록에서 확인하기" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "닫기" })).toBeInTheDocument();
  });

  it("[기록에서 확인하기] 클릭 시 onConfirm이 호출된다", async () => {
    const onConfirm = vi.fn();
    render(<PendingResultBanner onConfirm={onConfirm} onDismiss={vi.fn()} />);
    await userEvent.click(
      screen.getByRole("button", { name: "기록에서 확인하기" }),
    );
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("[닫기] 클릭 시 onDismiss가 호출된다", async () => {
    const onDismiss = vi.fn();
    render(<PendingResultBanner onConfirm={vi.fn()} onDismiss={onDismiss} />);
    await userEvent.click(screen.getByRole("button", { name: "닫기" }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
