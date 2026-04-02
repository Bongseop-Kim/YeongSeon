import { Button, DatePicker, Space } from "antd";
import dayjs, { type Dayjs } from "dayjs";

export type DateRange = [Dayjs, Dayjs];

interface DateRangeFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

type PresetKey = "today" | "last_week" | "last_month";

const PRESETS: { key: PresetKey; label: string; range: () => DateRange }[] = [
  { key: "today", label: "오늘", range: () => [dayjs(), dayjs()] },
  {
    key: "last_week",
    label: "최근 1주",
    range: () => [dayjs().subtract(6, "day"), dayjs()],
  },
  {
    key: "last_month",
    label: "최근 1달",
    range: () => [dayjs().subtract(29, "day"), dayjs()],
  },
];

function getActivePreset(value: DateRange): PresetKey | null {
  const [start, end] = value;
  for (const preset of PRESETS) {
    const [ps, pe] = preset.range();
    if (start.isSame(ps, "day") && end.isSame(pe, "day")) {
      return preset.key;
    }
  }
  return null;
}

export function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
  const activePreset = getActivePreset(value);

  return (
    <Space wrap>
      {PRESETS.map((preset) => (
        <Button
          key={preset.key}
          type={activePreset === preset.key ? "primary" : "default"}
          size="middle"
          onClick={() => onChange(preset.range())}
        >
          {preset.label}
        </Button>
      ))}
      <DatePicker.RangePicker
        value={value}
        onChange={(dates) => {
          if (dates && dates[0] && dates[1]) {
            onChange([dates[0], dates[1]]);
          }
        }}
        format="YYYY-MM-DD"
        allowClear={false}
      />
    </Space>
  );
}
