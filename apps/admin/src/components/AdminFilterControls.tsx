import { Text } from "seed-design/ui/text";
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
  label: ReactNode;
}

interface AdminFilterTextFieldProps extends Omit<
  TextFieldProps,
  "children" | "className" | "size"
> {
  inputProps: TextFieldInputProps;
}

type AdminFilterSelectProps = SelectHTMLAttributes<HTMLSelectElement>;

function cx(...classNames: Array<string | undefined>): string {
  return classNames.filter(Boolean).join(" ");
}

export function AdminFilterField({
  children,
  className,
  label,
}: AdminFilterFieldProps) {
  return (
    <label className={cx("adminFilterField", className)}>
      <Text as="span" textStyle="t3Bold" className="adminFilterLabel">
        {label}
      </Text>
      {children}
    </label>
  );
}

export function AdminFilterTextField({
  inputProps,
  ...textFieldProps
}: AdminFilterTextFieldProps) {
  return (
    <TextField
      className="adminFilterTextField"
      size="medium"
      {...textFieldProps}
    >
      <TextFieldInput {...inputProps} />
    </TextField>
  );
}

export function AdminFilterSelect({
  className,
  children,
  value,
  ...props
}: AdminFilterSelectProps) {
  const stringValue = value == null ? "" : String(value);
  const selectedLabel = getSelectedOptionLabel(children, stringValue);

  return (
    <span className={cx("adminFilterSelect", className)}>
      <FieldButton
        className="adminFilterSelectButton"
        buttonProps={{
          "aria-label": "선택된 필터 값",
          "aria-hidden": true,
          tabIndex: -1,
          type: "button",
        }}
      >
        {selectedLabel ? (
          <FieldButtonValue>{selectedLabel}</FieldButtonValue>
        ) : (
          <FieldButtonPlaceholder>선택</FieldButtonPlaceholder>
        )}
      </FieldButton>
      <select className="adminFilterSelectNative" value={value} {...props}>
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
