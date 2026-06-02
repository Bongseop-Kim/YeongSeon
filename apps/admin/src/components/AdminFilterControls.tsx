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

function cx(...classNames: Array<string | undefined>): string {
  return classNames.filter(Boolean).join(" ");
}

export function AdminFilterField({
  children,
  className,
}: AdminFilterFieldProps) {
  return <div className={cx("adminFilterField", className)}>{children}</div>;
}

export function AdminFilterTextField({
  inputProps,
  ...textFieldProps
}: AdminFilterTextFieldProps) {
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
