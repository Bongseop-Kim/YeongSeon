import type { ReactNode } from "react";
import { Text } from "seed-design/ui/text";
import { AdminCountBadge } from "@/components/AdminCountBadge";

interface AdminPanelHeaderProps {
  title: ReactNode;
  id: string;
  className: string;
  titleClassName: string;
  titleGroupClassName?: string;
  description?: ReactNode;
  descriptionClassName?: string;
  count?: ReactNode;
  actions?: ReactNode;
}

export function AdminPanelHeader({
  title,
  id,
  className,
  titleClassName,
  titleGroupClassName,
  description,
  descriptionClassName,
  count,
  actions,
}: AdminPanelHeaderProps) {
  const titleBlock = (
    <>
      <Text as="h2" textStyle="t6Bold" id={id} className={titleClassName}>
        {title}
        {count === undefined ? null : (
          <AdminCountBadge>{count}</AdminCountBadge>
        )}
      </Text>
      {description && descriptionClassName ? (
        <Text as="p" textStyle="t4Regular" className={descriptionClassName}>
          {description}
        </Text>
      ) : null}
    </>
  );

  return (
    <div className={className}>
      {titleGroupClassName ? (
        <div className={titleGroupClassName}>{titleBlock}</div>
      ) : (
        titleBlock
      )}
      {actions}
    </div>
  );
}
