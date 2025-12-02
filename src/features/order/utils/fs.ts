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

// OrderItem의 상세 정보 가져오기
export const getOrderItemDetails = (item: OrderItem): string => {
  if (item.type === "product") {
    const parts = [item.product.name];
    if (item.selectedOption) {
      parts.push(item.selectedOption.name);
    }
    return parts.join(" · ");
  } else {
    // reform 타입
    const { tie } = item.reformData;
    const details = [];
    if (tie.measurementType === "length" && tie.tieLength) {
      details.push(`길이 ${tie.tieLength}cm`);
    } else if (tie.measurementType === "height" && tie.wearerHeight) {
      details.push(`신장 ${tie.wearerHeight}cm 기준`);
    }
    return details.join(" · ") || "수선";
  }
};
