import {
  FieldButton,
  FieldButtonPlaceholder,
  FieldButtonValue,
} from "seed-design/ui/field-button";
import {
  TextField,
  TextFieldInput,
  type TextFieldInputProps,
  type TextFieldProps,
} from "seed-design/ui/text-field";
import {
  useRef,
  useState,
  type ChangeEvent,
  type MouseEvent,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import {
  getFieldButtonAriaLabel,
  getSelectedOptionLabel,
  getTextLabel,
} from "./admin-select-utils";
import "./AdminFilterControls.css";

interface AdminFilterFieldProps {
  children: ReactNode;
  className?: string;
}

interface AdminFilterTextFieldProps extends Omit<
  TextFieldProps,
  "children" | "className" | "label" | "size"
> {
  inputProps: TextFieldInputProps;
  label: ReactNode;
}

interface AdminFilterSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: ReactNode;
  placeholder?: ReactNode;
  suffixIcon?: ReactNode;
}

function cx(...classNames: Array<string | undefined>): string {
  return classNames.filter(Boolean).join(" ");
}

export function AdminFilterField({
  children,
  className,
}: AdminFilterFieldProps) {
  return <div className={cx("adminFilterField", className)}>{children}</div>;
}

export function AdminFilterTextField(props: AdminFilterTextFieldProps) {
  if (props.inputProps.type === "date") {
    return <AdminFilterDateField {...props} />;
  }

  const { inputProps, ...textFieldProps } = props;

  return (
    <TextField
      className="adminFilterTextField"
      size="large"
      {...textFieldProps}
    >
      <TextFieldInput {...inputProps} />
    </TextField>
  );
}

function AdminFilterDateField({
  inputProps,
  prefixIcon,
  label,
  labelWeight,
  indicator,
  description,
  errorMessage,
  required,
  disabled,
  invalid,
  readOnly,
  showRequiredIndicator,
  value,
  defaultValue,
  onValueChange,
}: AdminFilterTextFieldProps) {
  const nativeInputRef = useRef<HTMLInputElement>(null);
  const [uncontrolledValue, setUncontrolledValue] = useState(
    () => defaultValue ?? "",
  );
  const isControlled = value !== undefined;
  const currentValue = isControlled ? value : uncontrolledValue;
  const stringValue = currentValue == null ? "" : String(currentValue);
  const {
    className: inputClassName,
    onChange: inputOnChange,
    onClick: inputOnClick,
    ...nativeInputProps
  } = inputProps;
  const placeholder = inputProps.placeholder ?? "날짜를 선택해주세요";
  const nativeAriaLabel = inputProps["aria-label"] ?? getTextLabel(label);

  const updateDateFieldValue = (event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.currentTarget.value;

    inputOnChange?.(event);

    if (!isControlled) {
      setUncontrolledValue(nextValue);
    }

    onValueChange?.(createValueChangePayload(nextValue));
  };

  const openDatePicker = (event: MouseEvent<HTMLInputElement>) => {
    inputOnClick?.(event);

    if (event.defaultPrevented) {
      return;
    }

    const nativeInput = nativeInputRef.current;

    if (!nativeInput?.showPicker) {
      return;
    }

    try {
      nativeInput.showPicker();
    } catch {
      return;
    }
  };

  return (
    <div className="adminFilterDateField">
      <FieldButton
        label={label}
        labelWeight={labelWeight}
        indicator={indicator}
        description={description}
        errorMessage={errorMessage}
        disabled={disabled ?? inputProps.disabled}
        invalid={invalid}
        showRequiredIndicator={showRequiredIndicator}
        className="adminFilterDateButton"
        prefixIcon={prefixIcon}
        buttonProps={{
          "aria-label": getFieldButtonAriaLabel(label, stringValue, "필터"),
          "aria-hidden": true,
          tabIndex: -1,
          type: "button",
        }}
      >
        {stringValue ? (
          <FieldButtonValue>{stringValue}</FieldButtonValue>
        ) : (
          <FieldButtonPlaceholder>{placeholder}</FieldButtonPlaceholder>
        )}
      </FieldButton>
      <input
        {...nativeInputProps}
        ref={nativeInputRef}
        aria-label={nativeAriaLabel}
        className={cx("adminFilterDateNative", inputClassName)}
        disabled={disabled ?? inputProps.disabled}
        readOnly={readOnly ?? inputProps.readOnly}
        required={required ?? inputProps.required}
        type="date"
        value={stringValue}
        onChange={updateDateFieldValue}
        onClick={openDatePicker}
      />
    </div>
  );
}

function createValueChangePayload(value: string) {
  const graphemes = Array.from(value);

  return {
    value,
    graphemes,
    slicedValue: value,
    slicedGraphemes: graphemes,
  };
}

export function AdminFilterSelect({
  className,
  children,
  label,
  placeholder = "선택",
  suffixIcon,
  value,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  ...props
}: AdminFilterSelectProps) {
  const stringValue = value == null ? "" : String(value);
  const selectedLabel = getSelectedOptionLabel(children, stringValue);
  const selectLabel = ariaLabelledBy
    ? undefined
    : (ariaLabel ?? getTextLabel(label));
  const fieldButtonLabel = getFieldButtonAriaLabel(
    label,
    selectedLabel,
    "필터",
  );

  return (
    <span className={cx("adminFilterSelect", className)}>
      <FieldButton
        label={label}
        className="adminFilterSelectButton"
        suffixIcon={suffixIcon}
        buttonProps={{
          "aria-label": fieldButtonLabel,
          "aria-hidden": true,
          tabIndex: -1,
          type: "button",
        }}
      >
        {selectedLabel ? (
          <FieldButtonValue>{selectedLabel}</FieldButtonValue>
        ) : (
          <FieldButtonPlaceholder>{placeholder}</FieldButtonPlaceholder>
        )}
      </FieldButton>
      <select
        aria-label={selectLabel}
        aria-labelledby={ariaLabelledBy}
        className="adminFilterSelectNative"
        value={value}
        {...props}
      >
        {children}
      </select>
    </span>
  );
}
