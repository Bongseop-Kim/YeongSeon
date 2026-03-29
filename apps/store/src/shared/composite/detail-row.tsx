import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

interface DetailRowProps {
  label: string;
  value: ReactNode;
}

export function DetailRow({ label, value }: DetailRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-zinc-100 py-3 last:border-b-0 last:pb-0 first:pt-0">
      <span className="text-sm text-zinc-500">{label}</span>
      <div className={cn("text-sm font-medium text-zinc-900 text-right")}>
        {value}
      </div>
    </div>
  );
}
