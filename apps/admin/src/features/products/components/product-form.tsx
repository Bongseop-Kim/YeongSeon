import { Text } from "seed-design/ui/text";
import { useRef, useState, type ChangeEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ActionButton } from "seed-design/ui/action-button";
import { Callout } from "seed-design/ui/callout";
import {
  TextField,
  TextFieldInput,
  TextFieldTextarea,
} from "seed-design/ui/text-field";
import type { useImageKitUpload } from "@/hooks/useImageKitUpload";
import {
  PRODUCT_CATEGORIES,
  PRODUCT_COLORS,
  PRODUCT_MATERIALS,
  PRODUCT_PATTERNS,
} from "@/features/products/types/admin-product";
import type {
  AdminProductFormOption,
  AdminProductFormValues,
  AdminProductOption,
} from "@/features/products/types/admin-product";
import "./products.css";

type ProductImageUploadController = ReturnType<typeof useImageKitUpload>;
type UploadFileItem = ProductImageUploadController["fileList"][number];

type ProductFormFieldSetter = <K extends keyof AdminProductFormValues>(
  key: K,
  value: AdminProductFormValues[K],
) => void;

interface ProductFormProps {
  mode: "create" | "edit";
  values: AdminProductFormValues;
  setField: ProductFormFieldSetter;
  setOption: (index: number, patch: Partial<AdminProductOption>) => void;
  addOption: () => void;
  removeOption: (index: number) => void;
  imageUpload: ProductImageUploadController;
  handleSubmit: () => Promise<void>;
  validationError: string | null;
  submitError: Error | null;
  isSubmitting: boolean;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

function toInputNumber(value: number | null): string {
  return value === null ? "" : String(value);
}

function parseOptionalNumber(value: string): number | null {
  return value === "" ? null : Number(value);
}

function createSelectOptions(values: readonly string[]) {
  return (
    <>
      <option value="">선택</option>
      {values.map((value) => (
        <option key={value} value={value}>
          {value}
        </option>
      ))}
    </>
  );
}

const CATEGORY_OPTIONS = createSelectOptions(PRODUCT_CATEGORIES);
const COLOR_OPTIONS = createSelectOptions(PRODUCT_COLORS);
const PATTERN_OPTIONS = createSelectOptions(PRODUCT_PATTERNS);
const MATERIAL_OPTIONS = createSelectOptions(PRODUCT_MATERIALS);

function productSubmitErrorMessage(error: Error | null): string | null {
  return error?.message ?? null;
}

interface ProductOptionRowProps {
  option: AdminProductFormOption;
  index: number;
  setOption: (index: number, patch: Partial<AdminProductOption>) => void;
  removeOption: (index: number) => void;
}

function ProductOptionRow({
  option,
  index,
  setOption,
  removeOption,
}: ProductOptionRowProps) {
  return (
    <div className="productOptionRow">
      <TextField
        className="productFormField"
        label="옵션명"
        value={option.name}
        onValueChange={({ value }) => setOption(index, { name: value })}
      >
        <TextFieldInput name={`option-${option.formKey}-name`} />
      </TextField>
      <TextField
        className="productFormField"
        label="추가금액"
        value={String(option.additionalPrice)}
        onValueChange={({ value }) =>
          setOption(index, { additionalPrice: Number(value || 0) })
        }
      >
        <TextFieldInput
          name={`option-${option.formKey}-price`}
          type="number"
          min={0}
          inputMode="numeric"
        />
      </TextField>
      <TextField
        className="productFormField"
        label="재고"
        value={toInputNumber(option.stock)}
        description="비워두면 무제한"
        onValueChange={({ value }) =>
          setOption(index, { stock: parseOptionalNumber(value) })
        }
      >
        <TextFieldInput
          name={`option-${option.formKey}-stock`}
          type="number"
          min={0}
          inputMode="numeric"
        />
      </TextField>
      <ActionButton
        type="button"
        variant="neutralWeak"
        onClick={() => removeOption(index)}
      >
        삭제
      </ActionButton>
    </div>
  );
}

export function ProductForm({
  mode,
  values,
  setField,
  setOption,
  addOption,
  removeOption,
  imageUpload,
  handleSubmit,
  validationError,
  submitError,
  isSubmitting,
}: ProductFormProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const hasOptions = values.options.length > 0;
  const submitErrorMessage = productSubmitErrorMessage(submitError);

  const handleFiles = (event: ChangeEvent<HTMLInputElement>): void => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    setImageError(null);

    if (files.length === 0) return;

    const invalidFile = files.find(
      (file) => !ACCEPTED_TYPES.has(file.type) || file.size > MAX_FILE_SIZE,
    );
    if (invalidFile) {
      setImageError(
        "JPG, PNG, GIF, WebP 형식의 10MB 이하 이미지만 업로드할 수 있습니다.",
      );
      return;
    }

    const uploadRequests = files.map((file, index) => {
      const uid = `native-${Date.now()}-${index}-${file.name}`;
      return {
        file: Object.assign(file, {
          uid,
          lastModifiedDate: new Date(file.lastModified),
        }),
        item: {
          uid,
          name: file.name,
          status: "uploading" as const,
        } satisfies UploadFileItem,
      };
    });

    imageUpload.handleChange({
      fileList: [
        ...imageUpload.fileList,
        ...uploadRequests.map(({ item }) => item),
      ],
    });

    uploadRequests.forEach(({ file }) => {
      void imageUpload.customRequest({
        file,
        onError: (error) => setImageError(error.message),
      });
    });
  };

  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    void handleSubmit();
  };

  return (
    <form className="productForm" onSubmit={handleFormSubmit}>
      <section className="productPanel" aria-labelledby="product-basic-title">
        <div className="productPanelHeader">
          <Text
            as="h2"
            textStyle="t6Bold"
            id="product-basic-title"
            className="productPanelTitle"
          >
            기본 정보
          </Text>
        </div>

        <div className="productFormGrid">
          <TextField
            className="productFormField"
            label="코드"
            value={values.code ?? ""}
            disabled
          >
            <TextFieldInput
              name="code"
              placeholder={
                mode === "create"
                  ? "카테고리 선택 후 자동 생성됩니다"
                  : undefined
              }
              disabled
            />
          </TextField>

          <TextField
            className="productFormField"
            label="상품명"
            value={values.name}
            required
            showRequiredIndicator
            onValueChange={({ value }) => setField("name", value)}
          >
            <TextFieldInput name="name" autoComplete="off" />
          </TextField>

          <TextField
            className="productFormField"
            label="가격"
            value={toInputNumber(values.price)}
            required
            showRequiredIndicator
            onValueChange={({ value }) =>
              setField("price", parseOptionalNumber(value))
            }
          >
            <TextFieldInput
              name="price"
              type="number"
              min={0}
              inputMode="numeric"
            />
          </TextField>

          <label className="productSelectField">
            <Text as="span" textStyle="t3Bold" className="productFieldLabel">
              카테고리 *
            </Text>
            <select
              className="productSelect"
              value={values.category}
              required
              onChange={(event) => setField("category", event.target.value)}
            >
              {CATEGORY_OPTIONS}
            </select>
          </label>

          <label className="productSelectField">
            <Text as="span" textStyle="t3Bold" className="productFieldLabel">
              색상 *
            </Text>
            <select
              className="productSelect"
              value={values.color}
              required
              onChange={(event) => setField("color", event.target.value)}
            >
              {COLOR_OPTIONS}
            </select>
          </label>

          <label className="productSelectField">
            <Text as="span" textStyle="t3Bold" className="productFieldLabel">
              패턴 *
            </Text>
            <select
              className="productSelect"
              value={values.pattern}
              required
              onChange={(event) => setField("pattern", event.target.value)}
            >
              {PATTERN_OPTIONS}
            </select>
          </label>

          <label className="productSelectField">
            <Text as="span" textStyle="t3Bold" className="productFieldLabel">
              소재 *
            </Text>
            <select
              className="productSelect"
              value={values.material}
              required
              onChange={(event) => setField("material", event.target.value)}
            >
              {MATERIAL_OPTIONS}
            </select>
          </label>

          <TextField
            className="productFormField productFormFieldFull"
            label="상품 정보"
            value={values.info}
            required
            showRequiredIndicator
            onValueChange={({ value }) => setField("info", value)}
          >
            <TextFieldTextarea name="info" />
          </TextField>

          {!hasOptions ? (
            <TextField
              className="productFormField"
              label="재고"
              value={toInputNumber(values.stock)}
              description="비워두면 무제한으로 저장됩니다."
              onValueChange={({ value }) =>
                setField("stock", parseOptionalNumber(value))
              }
            >
              <TextFieldInput
                name="stock"
                type="number"
                min={0}
                inputMode="numeric"
                placeholder="비워두면 무제한"
              />
            </TextField>
          ) : null}
        </div>
      </section>

      <section className="productPanel" aria-labelledby="product-image-title">
        <div className="productPanelHeader">
          <div>
            <Text
              as="h2"
              textStyle="t6Bold"
              id="product-image-title"
              className="productPanelTitle"
            >
              상품 이미지
            </Text>
            <Text
              as="p"
              textStyle="t4Regular"
              className="productPanelDescription"
            >
              첫 번째 이미지가 대표 이미지로 저장됩니다.
            </Text>
          </div>
        </div>

        <input
          ref={fileInputRef}
          className="productFileInput"
          type="file"
          accept=".jpg,.jpeg,.png,.gif,.webp"
          aria-label="상품 이미지 파일 선택"
          multiple
          onChange={handleFiles}
        />
        <div className="productImageActions">
          <ActionButton
            type="button"
            variant="neutralWeak"
            disabled={imageUpload.uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {imageUpload.uploading ? "업로드 중…" : "이미지 추가"}
          </ActionButton>
          <Text as="span" textStyle="t4Regular" className="productMutedText">
            JPG, PNG, GIF, WebP · 최대 10MB
          </Text>
        </div>
        {imageError || imageUpload.error ? (
          <Text as="p" textStyle="t4Regular" className="productErrorText">
            {imageError ?? imageUpload.error}
          </Text>
        ) : null}
        <ul className="productImageList">
          {imageUpload.fileList.map((file, index) => (
            <li key={file.uid} className="productImageItem">
              {file.url || file.thumbUrl ? (
                <img
                  className="productImagePreview"
                  src={file.url ?? file.thumbUrl}
                  alt=""
                />
              ) : (
                <div className="productImagePreview productImagePlaceholder">
                  업로드 중
                </div>
              )}
              <div className="productImageMeta">
                <Text as="strong" textStyle="t5Bold">
                  {file.name}
                </Text>
                {index === 0 && file.status === "done" ? (
                  <Text
                    as="span"
                    textStyle="t4Regular"
                    className="productPrimaryImage"
                  >
                    대표
                  </Text>
                ) : null}
                <Text
                  as="span"
                  textStyle="t4Regular"
                  className="productMutedText"
                >
                  {file.status === "done" ? "업로드 완료" : "업로드 중"}
                </Text>
              </div>
              <div className="productImageControls">
                <ActionButton
                  type="button"
                  variant="neutralWeak"
                  disabled={index === 0}
                  onClick={() => imageUpload.moveFile(index, index - 1)}
                >
                  위로
                </ActionButton>
                <ActionButton
                  type="button"
                  variant="neutralWeak"
                  disabled={index === imageUpload.fileList.length - 1}
                  onClick={() => imageUpload.moveFile(index, index + 1)}
                >
                  아래로
                </ActionButton>
                <ActionButton
                  type="button"
                  variant="neutralWeak"
                  onClick={() => imageUpload.handleRemove(file)}
                >
                  제거
                </ActionButton>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="productPanel" aria-labelledby="product-option-title">
        <div className="productPanelHeader">
          <div>
            <Text
              as="h2"
              textStyle="t6Bold"
              id="product-option-title"
              className="productPanelTitle"
            >
              옵션
            </Text>
            <Text
              as="p"
              textStyle="t4Regular"
              className="productPanelDescription"
            >
              옵션을 추가하면 상품 단일 재고 대신 옵션 재고를 사용합니다.
            </Text>
          </div>
          <ActionButton type="button" variant="neutralWeak" onClick={addOption}>
            옵션 추가
          </ActionButton>
        </div>

        {hasOptions ? (
          <>
            <TextField
              className="productFormField productOptionLabelField"
              label="옵션 제목"
              value={values.optionLabel}
              onValueChange={({ value }) => setField("optionLabel", value)}
            >
              <TextFieldInput
                name="optionLabel"
                placeholder="예: 길이, 색상, 사이즈"
              />
            </TextField>
            <div className="productOptionList">
              {values.options.map((option, index) => (
                <ProductOptionRow
                  key={option.formKey}
                  option={option}
                  index={index}
                  setOption={setOption}
                  removeOption={removeOption}
                />
              ))}
            </div>
          </>
        ) : (
          <Text as="p" textStyle="t4Regular" className="productMutedText">
            등록된 옵션이 없습니다.
          </Text>
        )}
      </section>

      {validationError ? (
        <Callout tone="critical" description={validationError} role="alert" />
      ) : null}
      {submitErrorMessage ? (
        <Callout
          tone="critical"
          description={submitErrorMessage}
          role="alert"
        />
      ) : null}

      <div className="productFormActions">
        <ActionButton
          type="button"
          variant="neutralWeak"
          disabled={isSubmitting}
          onClick={() =>
            navigate({ pathname: "/products", search: location.search })
          }
        >
          취소
        </ActionButton>
        <ActionButton
          type="submit"
          loading={isSubmitting}
          disabled={isSubmitting || imageUpload.uploading}
        >
          {mode === "create" ? "상품 생성" : "상품 저장"}
        </ActionButton>
      </div>
    </form>
  );
}
