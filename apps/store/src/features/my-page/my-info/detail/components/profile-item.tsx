interface ProfileItemProps {
  label: string;
  value: string;
}

export function ProfileItem({ label, value }: ProfileItemProps) {
  return (
    <div className="flex gap-2">
      <span className="w-20 font-bold">{label}</span>
      <span>{value}</span>
    </div>
  );
}
