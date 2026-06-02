import { Children, isValidElement, type ReactNode } from "react";

export function getSelectedOptionLabel(
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

export function getTextLabel(label: ReactNode): string | undefined {
  return typeof label === "string" ? label : undefined;
}

export function getFieldButtonAriaLabel(
  label: ReactNode,
  selectedLabel: ReactNode,
  fallbackLabel: string,
): string {
  const fieldLabel = getTextLabel(label) ?? fallbackLabel;
  const valueLabel = getTextLabel(selectedLabel) ?? "선택 안 됨";

  return `${fieldLabel}: ${valueLabel}`;
}
