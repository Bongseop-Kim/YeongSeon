import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { ImageUpload } from "@/features/custom-order/components/image-upload";
import type { ImageUploadHook } from "@/features/custom-order/types/image-upload";

const baseProps = {
  uploadedImages: [],
  isUploading: false,
  onFileSelect: vi.fn(),
  onRemoveImage: vi.fn(),
} satisfies ComponentProps<typeof ImageUpload>;

function renderImageUpload(
  props: Partial<ComponentProps<typeof ImageUpload>> = {},
) {
  return render(<ImageUpload {...baseProps} {...props} />);
}

describe("ImageUpload", () => {
  it("업로드된 이미지를 정사각형 타일로 보여주고 마지막에 추가 타일을 둔다", () => {
    const uploadedImages: ImageUploadHook["uploadedImages"] = [
      {
        name: "stripe sample",
        url: "https://cdn.example.com/stripe.jpg",
        fileId: "file-1",
      },
      {
        name: "empty preview",
        url: "",
        fileId: "file-2",
      },
    ];

    renderImageUpload({ uploadedImages, showHeader: false });

    expect(screen.getByRole("img", { name: "stripe sample" })).toHaveClass(
      "object-cover",
    );
    expect(screen.getByLabelText("empty preview 미리보기 없음")).toBeVisible();
    expect(screen.getByText("추가")).toBeVisible();
    expect(screen.getByLabelText("이미지 추가")).toHaveClass("aspect-square");
  });

  it("삭제 버튼은 해당 이미지 index로 onRemoveImage를 호출한다", async () => {
    const user = userEvent.setup();
    const onRemoveImage = vi.fn();

    renderImageUpload({
      uploadedImages: [
        {
          name: "stripe sample",
          url: "https://cdn.example.com/stripe.jpg",
          fileId: "file-1",
        },
      ],
      onRemoveImage,
      showHeader: false,
    });

    await user.click(
      screen.getByRole("button", { name: "stripe sample 삭제" }),
    );

    expect(onRemoveImage).toHaveBeenCalledWith(0);
  });

  it("추가 타일에서 파일을 선택하면 onFileSelect를 호출한다", async () => {
    const user = userEvent.setup();
    const onFileSelect = vi.fn();
    const file = new File(["image"], "sample.jpg", { type: "image/jpeg" });

    renderImageUpload({ onFileSelect, showHeader: false });

    await user.upload(
      within(screen.getByLabelText("이미지 추가")).getByLabelText(
        "이미지 파일 선택",
      ),
      file,
    );

    expect(onFileSelect).toHaveBeenCalledWith(file);
  });

  it("업로드 중에는 추가 타일에 로딩 상태를 보여준다", () => {
    renderImageUpload({ isUploading: true, showHeader: false });

    expect(screen.getByText("업로드 중...")).toBeVisible();
    expect(screen.getByLabelText("이미지 파일 선택")).toBeDisabled();
  });
});
