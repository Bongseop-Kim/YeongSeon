import type { ReactNode } from "react";
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

export function AdminSegmentedControl<T extends string>({
  ariaLabel,
  as: Component = "div",
  className,
  value,
  onValueChange,
  ...props
}: AdminSegmentedControlProps<T>) {
  if (props.selectionMode === "tab") {
    return (
      <Component
        aria-label={ariaLabel}
        className={cx("adminSegmentedControl", className)}
        role="tablist"
      >
        {props.options.map((option) => {
          const isSelected = value === option.value;

          return (
            <button
              key={option.value}
              id={option.tabId}
              type="button"
              className="adminSegmentedControlButton"
              role="tab"
              aria-controls={option.panelId}
              aria-selected={isSelected}
              onClick={() => onValueChange(option.value)}
            >
              <span className="adminSegmentedControlLabel">{option.label}</span>
              {option.notification ? (
                <span className="adminSegmentedControlDot" aria-hidden="true" />
              ) : null}
            </button>
          );
        })}
      </Component>
    );
  }

  return (
    <Component
      aria-label={ariaLabel}
      className={cx("adminSegmentedControl", className)}
    >
      {props.options.map((option) => {
        const isSelected = value === option.value;

        return (
          <button
            key={option.value}
            type="button"
            className="adminSegmentedControlButton"
            aria-pressed={isSelected}
            onClick={() => onValueChange(option.value)}
          >
            <span className="adminSegmentedControlLabel">{option.label}</span>
            {option.notification ? (
              <span className="adminSegmentedControlDot" aria-hidden="true" />
            ) : null}
          </button>
        );
      })}
    </Component>
  );
}
