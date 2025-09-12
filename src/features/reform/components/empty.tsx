import { PackageOpen } from "lucide-react";

interface EmptyProps {
  title?: string;
  description?: string;
  className?: string;
}

export function Empty({
  title = "데이터가 없습니다.",
  description = "데이터가 없습니다.",
  className = "",
}: EmptyProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-12 px-4 ${className}`}
    >
      <div className="flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
        <PackageOpen className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 text-center">{description}</p>
    </div>
  );
}
