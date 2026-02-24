import type { ReactNode } from "react";
import { Label } from "./label";

interface FormSectionProps {
  title: string;
  children: ReactNode;
}

export const FormSection = ({ title, children }: FormSectionProps) => {
  return (
    <div className="space-y-4">
      <Label className="text-md">{title}</Label>

      <div className="space-y-4 pl-2">{children}</div>
    </div>
  );
};
