import { IconChevronDownLine } from "@karrotmarket/react-monochrome-icon";
import {
  Children,
  isValidElement,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import {
  FieldButton,
  FieldButtonPlaceholder,
  FieldButtonValue,
} from "seed-design/ui/field-button";
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
  const buttonLabel = getFieldButtonAriaLabel(label, selectedLabel);

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
  const fieldLabel = getTextLabel(label) ?? "선택 필드";
  const valueLabel = getTextLabel(selectedLabel) ?? "선택 안 됨";

  return `${fieldLabel}: ${valueLabel}`;
}
