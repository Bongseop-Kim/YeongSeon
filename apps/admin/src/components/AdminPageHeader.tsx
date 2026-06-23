import type { ReactNode } from "react";
import { Text } from "seed-design/ui/text";

interface AdminPageHeaderProps {
  title: ReactNode;
  description: ReactNode;
  className?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  titleGroupClassName?: string;
  actions?: ReactNode;
}

export function AdminPageHeader({
  title,
  description,
  className,
  titleClassName,
  descriptionClassName,
  titleGroupClassName,
  actions,
}: AdminPageHeaderProps) {
  const titleBlock = (
    <>
      <Text as="h1" textStyle="screenTitle" className={titleClassName}>
        {title}
      </Text>
      <Text as="p" textStyle="t4Regular" className={descriptionClassName}>
        {description}
      </Text>
    </>
  );

  return (
    <header className={className}>
      {titleGroupClassName ? (
        <div className={titleGroupClassName}>{titleBlock}</div>
      ) : (
        titleBlock
      )}
      {actions}
    </header>
  );
}
