import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StepLayoutProps {
  guideTitle: string;
  guideItems: string[];
  children: ReactNode;
  className?: string;
}

export const StepLayout = ({
  guideTitle,
  guideItems,
  children,
  className,
}: StepLayoutProps) => (
  <div className={cn("space-y-3", className)}>
    <div className="grid grid-cols-1 lg:grid-cols-[250px_minmax(0,1fr)]">
      <Card>
        <CardHeader>
          <CardTitle>{guideTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1.5">
            {guideItems.map((item) => (
              <li
                key={`${guideTitle}-${item}`}
                className="text-xs leading-5 text-zinc-600"
              >
                {"\u2022"} {item}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <div>{children}</div>
    </div>
  </div>
);
