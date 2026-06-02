import {
  IconCalendarLine,
  IconChevronDownLine,
} from "@karrotmarket/react-monochrome-icon";
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
  Children,
  isValidElement,
  useState,
  type ChangeEvent,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
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
}

const DATE_FIELD_PREFIX_ICON = <IconCalendarLine />;
const SELECT_SUFFIX_ICON = <IconChevronDownLine />;

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
  prefixIcon = DATE_FIELD_PREFIX_ICON,
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
  const [uncontrolledValue, setUncontrolledValue] = useState(
    () => defaultValue ?? "",
  );
  const isControlled = value !== undefined;
  const currentValue = isControlled ? value : uncontrolledValue;
  const stringValue = currentValue == null ? "" : String(currentValue);
  const {
    className: inputClassName,
    onChange: inputOnChange,
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

  return (
    <span className="adminFilterDateField">
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
          "aria-label": getFieldButtonAriaLabel(label, stringValue),
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
        aria-label={nativeAriaLabel}
        className={cx("adminFilterDateNative", inputClassName)}
        disabled={disabled ?? inputProps.disabled}
        readOnly={readOnly ?? inputProps.readOnly}
        required={required ?? inputProps.required}
        type="date"
        value={stringValue}
        onChange={updateDateFieldValue}
      />
    </span>
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
  const fieldButtonLabel = getFieldButtonAriaLabel(label, selectedLabel);

  return (
    <span className={cx("adminFilterSelect", className)}>
      <FieldButton
        label={label}
        className="adminFilterSelectButton"
        suffixIcon={SELECT_SUFFIX_ICON}
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

function getSelectedOptionLabel(
  children: ReactNode,
  selectedValue: string,
): ReactNode {
  let selectedLabel: ReactNode = null;

  Children.forEach(children, (child) => {
    if (
      selectedLabel ||
      !isValidElement<{ children?: ReactNode; value?: string }>(child)
    ) {
      return;
    }
    if (String(child.props.value ?? "") === selectedValue) {
      selectedLabel = child.props.children;
    }
  });

  return selectedLabel;
}

function getTextLabel(label: ReactNode): string | undefined {
  return typeof label === "string" ? label : undefined;
}

function getFieldButtonAriaLabel(
  label: ReactNode,
  selectedLabel: ReactNode,
): string {
  const fieldLabel = getTextLabel(label) ?? "필터";
  const valueLabel = getTextLabel(selectedLabel) ?? "선택 안 됨";

  return `${fieldLabel}: ${valueLabel}`;
}
