import { Label } from "@/components/ui/label";

interface ProfileItemProps {
  label: string;
  value: string;
}

export function ProfileItem({ label, value }: ProfileItemProps) {
  return (
    <div className="flex gap-2">
      <Label className="w-20 font-bold">{label}</Label>
      <Label>{value}</Label>
    </div>
  );
}
