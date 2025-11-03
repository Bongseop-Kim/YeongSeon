import type { DateFilterPreset } from "@/store/search";

export const DATE_PRESETS: { value: DateFilterPreset; label: string }[] = [
  { value: "5years", label: "5년" },
  { value: "1month", label: "1개월" },
  { value: "2months", label: "2개월" },
  { value: "3months", label: "3개월" },
];
