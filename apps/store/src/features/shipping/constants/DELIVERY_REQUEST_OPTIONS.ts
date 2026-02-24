export const DELIVERY_REQUEST_OPTIONS = [
  { value: "DELIVERY_REQUEST_1", label: "문 앞에 놔주세요." },
  { value: "DELIVERY_REQUEST_2", label: "경비실에 맡겨 주세요." },
  { value: "DELIVERY_REQUEST_3", label: "택배함에 넣어 주세요." },
  { value: "DELIVERY_REQUEST_4", label: "배송 전에 연락 주세요." },
  { value: "DELIVERY_REQUEST_5", label: "직접입력" },
];

const labelMap = new Map(
  DELIVERY_REQUEST_OPTIONS.map((o) => [o.value, o.label])
);

export const getDeliveryRequestLabel = (
  value: string | undefined | null,
  memo?: string | null
): string | undefined => {
  if (!value) return undefined;
  if (value === "DELIVERY_REQUEST_5") return memo || "직접입력";
  return labelMap.get(value) ?? value;
};
