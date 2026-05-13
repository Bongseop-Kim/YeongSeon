import { render, screen } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";
import { describe, expect, it } from "vitest";
import type { QuoteOrderOptions } from "@/entities/custom-order";
import { QuantityStep } from "@/features/custom-order/components/steps/quantity-step";
import { FabricStep } from "@/features/custom-order/components/steps/fabric-step";
import { SewingStep } from "@/features/custom-order/components/steps/sewing-step";
import { SpecStep } from "@/features/custom-order/components/steps/spec-step";
import { FinishingStep } from "@/features/custom-order/components/steps/finishing-step";
import { AttachmentStep } from "@/features/custom-order/components/steps/attachment-step";
import type { ImageUploadHook } from "@/features/custom-order/types/image-upload";

const defaultValues: QuoteOrderOptions = {
  fabricProvided: false,
  reorder: false,
  fabricType: "POLY",
  designType: "PRINTING",
  tieType: null,
  interlining: null,
  interliningThickness: "THICK",
  sizeType: "ADULT",
  tieWidth: 8,
  triangleStitch: true,
  sideStitch: true,
  barTack: false,
  fold7: false,
  dimple: false,
  spoderato: false,
  brandLabel: false,
  careLabel: false,
  quantity: 4,
  referenceImages: null,
  additionalNotes: "",
  contactName: "",
  contactTitle: "",
  contactMethod: "phone",
  contactValue: "",
};

function renderWithForm(ui: React.ReactNode) {
  function Wrapper() {
    const form = useForm<QuoteOrderOptions>({ defaultValues });
    return <FormProvider {...form}>{ui}</FormProvider>;
  }

  return render(<Wrapper />);
}

const imageUploadStub = {
  uploadedImages: [],
  isUploading: false,
  uploadFile: async () => undefined,
  removeImage: () => undefined,
  addExistingImage: () => undefined,
  addExistingImages: () => undefined,
  getImageRefs: () => [],
} satisfies ImageUploadHook;

describe("custom order steps", () => {
  it("부연 설명 없이 주요 선택 항목만 렌더링한다", () => {
    renderWithForm(
      <>
        <QuantityStep />
        <FabricStep />
        <SewingStep />
        <SpecStep />
        <FinishingStep />
      </>,
    );

    expect(screen.getByText("시작 방식")).toBeInTheDocument();
    expect(screen.getByText("원단 직접 제공")).toBeInTheDocument();
    expect(screen.getByText("재주문")).toBeInTheDocument();
    expect(screen.getByText("봉제 스타일")).toBeInTheDocument();
    expect(screen.getByText("라벨")).toBeInTheDocument();

    expect(
      screen.queryByText(
        "원단 보유 여부와 재주문 여부를 먼저 정하면 이후 단계가 간결해집니다.",
      ),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("보유한 원단을 보내주시면 봉제만 진행합니다"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("이전에 주문한 동일 디자인으로 재주문합니다"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        "소재와 직조 방식 조합을 정하면 이후 봉제와 마감 선택 기준이 선명해집니다.",
      ),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        "필요한 디테일만 추가해 제작 완성도를 조절합니다. 중복 선택 가능합니다.",
      ),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("매듭 아래 자연스러운 주름"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("안감 없이 가볍게 마감")).not.toBeInTheDocument();
    expect(
      screen.queryByText("한 장의 원단을 7번 접어 제작"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("형태 유지감과 완성 톤을 결정하는 기본 마감입니다."),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("실제 착용감과 스타일 기준으로 폭을 조절합니다."),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("고객의 브랜드 라벨을 부착합니다"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("세탁 방법 등의 케어 라벨을 부착합니다"),
    ).not.toBeInTheDocument();
  });

  it("봉제 스타일을 다른 체크박스 섹션과 같은 리스트 형태로 렌더링한다", () => {
    renderWithForm(<SewingStep />);

    expect(screen.getByRole("checkbox", { name: "딤플" })).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: "스포데라토" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "7폴드" })).toBeInTheDocument();
    expect(screen.getAllByRole("checkbox")).toHaveLength(3);
    expect(
      screen.queryByText("자동 타이에서만 선택할 수 있어요"),
    ).not.toBeInTheDocument();
  });

  it("연속된 선택 섹션 사이에 border-y로 인한 이중 라인을 만들지 않는다", () => {
    const { container } = renderWithForm(
      <>
        <QuantityStep />
        <FabricStep />
        <SewingStep />
        <SpecStep />
        <FinishingStep />
        <AttachmentStep imageUpload={imageUploadStub} />
      </>,
    );

    const sectionLabels = [
      "시작 방식",
      "수량 선택",
      "원단 조합",
      "타이 종류",
      "봉제 스타일",
      "사이즈 타입",
      "넥타이 폭",
      "심지",
      "추가 봉제",
      "라벨",
      "참고 이미지",
      "추가 요청사항",
    ].map((label) => screen.getByText(label));

    sectionLabels.slice(0, -1).forEach((label, index) => {
      expect(
        label.compareDocumentPosition(sectionLabels[index + 1]) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });
    expect(container.querySelectorAll('[data-slot="separator"]')).toHaveLength(
      0,
    );
  });

  it("첨부 단계는 sample-order처럼 중복 제목과 불필요한 업로드 설명을 숨긴다", () => {
    renderWithForm(<AttachmentStep imageUpload={imageUploadStub} />);

    expect(screen.getAllByText("참고 이미지")).toHaveLength(1);
    expect(
      screen.queryByText("PNG, JPG, GIF 파일 지원"),
    ).not.toBeInTheDocument();
    expect(screen.getAllByText("추가 요청사항")).toHaveLength(1);
  });
});
