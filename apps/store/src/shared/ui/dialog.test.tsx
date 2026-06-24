import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Dialog, DialogContent, DialogTitle } from "@/shared/ui/dialog";
import {
  Dialog as ExtendedDialog,
  DialogContent as ExtendedDialogContent,
  DialogTitle as ExtendedDialogTitle,
} from "@/shared/ui-extended/dialog";

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

  it("focuses content instead of the first field on open", async () => {
    render(
      <ExtendedDialog open>
        <ExtendedDialogContent>
          <ExtendedDialogTitle>인증</ExtendedDialogTitle>
          <input aria-label="휴대폰 번호" />
        </ExtendedDialogContent>
      </ExtendedDialog>,
    );

    await waitFor(() => expect(screen.getByRole("dialog")).toHaveFocus());
    expect(screen.getByLabelText("휴대폰 번호")).not.toHaveFocus();
  });
});
