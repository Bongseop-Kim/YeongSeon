import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DimpleSegment } from "@/shared/composite/dimple-segment";

describe("DimpleSegment", () => {
  it("활성 상태에서 비선택 버튼도 흰 배경 위에서 읽을 수 있는 스타일을 가진다", () => {
    render(<DimpleSegment value={false} onChange={vi.fn()} isActive={true} />);

    expect(screen.getByRole("button", { name: "딤플" })).toHaveClass(
      "bg-white",
      "text-muted-foreground",
    );
  });
});
