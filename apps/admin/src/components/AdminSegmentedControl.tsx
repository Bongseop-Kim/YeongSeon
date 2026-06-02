import type { ReactNode } from "react";
import { ActionButton } from "seed-design/ui/action-button";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "seed-design/ui/segmented-control";
import "./AdminSegmentedControl.css";

export interface AdminSegmentedControlOption<T extends string> {
  value: T;
  label: ReactNode;
  notification?: boolean;
}

export interface AdminSegmentedControlTabOption<
  T extends string,
> extends AdminSegmentedControlOption<T> {
  tabId: string;
  panelId: string;
}

interface AdminSegmentedControlBaseProps<T extends string> {
  ariaLabel: string;
  as?: "div" | "nav";
  className?: string;
  value: T | null;
  onValueChange: (value: T) => void;
}

type AdminSegmentedControlProps<T extends string> =
  | (AdminSegmentedControlBaseProps<T> & {
      options: readonly AdminSegmentedControlOption<T>[];
      selectionMode?: "pressed";
    })
  | (AdminSegmentedControlBaseProps<T> & {
      options: readonly AdminSegmentedControlTabOption<T>[];
      selectionMode: "tab";
    });

function cx(...classNames: Array<string | undefined>): string {
  return classNames.filter(Boolean).join(" ");
}

function isTabOption<T extends string>(
  option: AdminSegmentedControlOption<T>,
): option is AdminSegmentedControlTabOption<T> {
  return "tabId" in option && "panelId" in option;
}

interface AdminSegmentedControlOptionContentProps<T extends string> {
  option: AdminSegmentedControlOption<T>;
}

function AdminSegmentedControlOptionContent<T extends string>({
  option,
}: AdminSegmentedControlOptionContentProps<T>) {
  return (
    <>
      <span className="adminSegmentedControlLabel">{option.label}</span>
      {option.notification ? (
        <span className="adminSegmentedControlDot" aria-hidden="true" />
      ) : null}
    </>
  );
}

export function AdminSegmentedControl<T extends string>({
  ariaLabel,
  as: Component = "div",
  className,
  value,
  onValueChange,
  ...props
}: AdminSegmentedControlProps<T>) {
  if (props.selectionMode !== "tab") {
    const buttonGroup = (
      <div
        aria-label={ariaLabel}
        className={cx("adminSegmentedControlButtonGroup", className)}
      >
        {props.options.map((option) => {
          const isSelected = value === option.value;

          return (
            <ActionButton
              key={option.value}
              type="button"
              variant={isSelected ? "brandOutline" : "neutralWeak"}
              size="small"
              aria-pressed={isSelected}
              onClick={() => onValueChange(option.value)}
            >
              <AdminSegmentedControlOptionContent option={option} />
            </ActionButton>
          );
        })}
      </div>
    );

    return Component === "nav" ? (
      <nav aria-label={ariaLabel}>{buttonGroup}</nav>
    ) : (
      buttonGroup
    );
  }

  const segmentedControl = (
    <SegmentedControl
      aria-label={ariaLabel}
      className={cx("adminSegmentedControlTabs", className)}
      role="tablist"
      value={value ?? undefined}
      onValueChange={(nextValue) => {
        const option = props.options.find(
          (candidate) => candidate.value === nextValue,
        );

        if (option) onValueChange(option.value);
      }}
    >
      {props.options.map((option) => {
        const tabProps = isTabOption(option)
          ? {
              id: option.tabId,
              role: "tab",
              "aria-controls": option.panelId,
              "aria-selected": value === option.value,
            }
          : {};

        return (
          <SegmentedControlItem
            key={option.value}
            value={option.value}
            notification={option.notification}
            {...tabProps}
          >
            {option.label}
          </SegmentedControlItem>
        );
      })}
    </SegmentedControl>
  );

  return Component === "nav" ? (
    <nav aria-label={ariaLabel}>{segmentedControl}</nav>
  ) : (
    segmentedControl
  );
}
