const formatShippingCost = (shippingCost: number | undefined) =>
  typeof shippingCost === "number" && Number.isFinite(shippingCost)
    ? `${shippingCost.toLocaleString()}원`
    : null;

export const createShippingNoticeItems = ({
  shippingCost,
  periodNotice,
}: {
  shippingCost: number | undefined;
  periodNotice: string;
}) => {
  const formattedShippingCost = formatShippingCost(shippingCost);

  return [
    formattedShippingCost
      ? `제주/도서산간 지역은 배송비 ${formattedShippingCost}이 추가됩니다.`
      : "제주/도서산간 지역은 추가 배송비가 발생할 수 있습니다.",
    periodNotice,
    "접수 이후에는 취소 및 환불이 불가능합니다.",
    "접수 전 취소 시 수선 택배비 및 신청한 택배 수거비는 환불되지 않습니다.",
  ];
};
