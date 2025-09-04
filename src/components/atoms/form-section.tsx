import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

interface FormSectionProps {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}

export const FormSection = ({
  icon: Icon,
  title,
  children,
}: FormSectionProps) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-stone-100 rounded-lg flex items-center justify-center">
          <Icon className="w-4 h-4 text-stone-600" />
        </div>
        <h2 className="text-lg font-semibold text-stone-900">{title}</h2>
      </div>
      <div className="space-y-6">{children}</div>
    </div>
  );
};
