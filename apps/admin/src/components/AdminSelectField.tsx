import { IconChevronDownLine } from "@karrotmarket/react-monochrome-icon";
import { type ReactNode, type SelectHTMLAttributes } from "react";
import {
  FieldButton,
  FieldButtonPlaceholder,
  FieldButtonValue,
} from "seed-design/ui/field-button";
import {
  getFieldButtonAriaLabel,
  getSelectedOptionLabel,
  getTextLabel,
} from "./admin-select-utils";
import "./AdminSelectField.css";

interface AdminSelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: ReactNode;
  placeholder?: ReactNode;
  invalid?: boolean;
  showRequiredIndicator?: boolean;
}

const SELECT_SUFFIX_ICON = <IconChevronDownLine />;

function cx(...classNames: Array<string | undefined>): string {
  return classNames.filter(Boolean).join(" ");
}

export function AdminSelectField({
  className,
  children,
  disabled,
  invalid,
  label,
  placeholder = "선택",
  required,
  showRequiredIndicator = required,
  value,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  ...props
}: AdminSelectFieldProps) {
  const stringValue = value == null ? "" : String(value);
  const selectedLabel = getSelectedOptionLabel(children, stringValue);
  const selectLabel = ariaLabelledBy
    ? undefined
    : (ariaLabel ?? getTextLabel(label));
  const buttonLabel = getFieldButtonAriaLabel(
    label,
    selectedLabel,
    "선택 필드",
  );

  return (
    <span className={cx("adminSelectField", className)}>
      <FieldButton
        label={label}
        disabled={disabled}
        invalid={Boolean(invalid)}
        showRequiredIndicator={showRequiredIndicator}
        className="adminSelectButton"
        suffixIcon={SELECT_SUFFIX_ICON}
        buttonProps={{
          "aria-hidden": true,
          "aria-label": buttonLabel,
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
        className="adminSelectNative"
        disabled={disabled}
        required={required}
        value={value}
        {...props}
      >
        {children}
      </select>
    </span>
  );
}
