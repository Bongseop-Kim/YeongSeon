import { Button, DatePicker, Space } from "antd";
import dayjs, { type Dayjs } from "dayjs";

export type DateRange = [Dayjs, Dayjs];

interface DateRangeFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

type PresetKey = "today" | "this_week" | "this_month";

const PRESETS: { key: PresetKey; label: string; range: () => DateRange }[] = [
  { key: "today", label: "오늘", range: () => [dayjs(), dayjs()] },
  {
    key: "this_week",
    label: "이번 주",
    range: () => [dayjs().startOf("week"), dayjs().endOf("week")],
  },
  {
    key: "this_month",
    label: "이번 달",
    range: () => [dayjs().startOf("month"), dayjs().endOf("month")],
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
          size="small"
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
