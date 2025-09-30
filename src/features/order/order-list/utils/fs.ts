import type { OrderItem } from "../types/order-item";

export const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return "오늘";
  } else if (date.toDateString() === yesterday.toDateString()) {
    return "어제";
  } else {
    return date.toLocaleDateString("ko-KR", {
      year: "2-digit",
      month: "2-digit",
      day: "2-digit",
      weekday: "long",
    });
  }
};

export const getOrderTypeLabel = (type: "custom-order" | "reform") => {
  return type === "custom-order" ? "맞춤 제작" : "수선";
};

export const getOrderDetails = (order: OrderItem) => {
  if (order.type === "custom-order") {
    const { fabricType, designType, tieType, quantity } = order.orderDetails;
    const details = [];
    if (fabricType) details.push(fabricType === "SILK" ? "실크" : "폴리");
    if (designType) details.push(designType === "PRINTING" ? "프린팅" : "선염");
    if (tieType) details.push(tieType === "MANUAL" ? "수동" : "자동");
    if (quantity) details.push(`${quantity}개`);
    return details.join(" · ");
  } else {
    const { tieCount, measurementType } = order.orderDetails;
    const details = [];
    if (tieCount) details.push(`넥타이 ${tieCount}개`);
    if (measurementType)
      details.push(measurementType === "length" ? "길이 조절" : "신장 기준");
    return details.join(" · ");
  }
};
