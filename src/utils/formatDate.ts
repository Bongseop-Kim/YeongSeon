export const formatDate = (dateString: string) => {
  const date = new Date(dateString);

  // 유효하지 않은 날짜 처리
  if (isNaN(date.getTime())) {
    console.error(`Invalid date string: ${dateString}`);
    return dateString;
  }

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
