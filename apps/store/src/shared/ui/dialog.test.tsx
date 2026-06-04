import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Dialog, DialogContent, DialogTitle } from "@/shared/ui/dialog";

describe("DialogContent", () => {
  it("sheet presentation renders a visible dismiss control", () => {
    render(
      <Dialog open>
        <DialogContent mobilePresentation="sheet">
          <DialogTitle>시트 제목</DialogTitle>
        </DialogContent>
      </Dialog>,
    );

    expect(screen.getByRole("button", { name: "닫기" })).toBeInTheDocument();
  });
});
