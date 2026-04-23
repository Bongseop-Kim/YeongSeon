import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StatusLogTable } from "@/components/StatusLogTable";

describe("StatusLogTable", () => {
  it("롤백이 아닌 이력에도 정상 태그를 표시한다", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <StatusLogTable
        logs={[
          {
            id: "log-1",
            previousStatus: "접수",
            newStatus: "수선중",
            memo: null,
            isRollback: false,
            createdAt: "2026-03-31T10:00:00Z",
          },
        ]}
        statusColors={{ 접수: "default", 수선중: "processing" }}
      />,
    );

    expect(screen.getByText("정상")).toBeInTheDocument();
    expect(errorSpy).not.toHaveBeenCalledWith(
      expect.stringContaining(
        "Not implemented: Window's getComputedStyle() method: with pseudo-elements",
      ),
    );
  });
});
