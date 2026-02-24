const APP_TIMEZONE = "UTC";

export const formatDate = (dateString: string) => {
  const date = new Date(dateString);

  // 유효하지 않은 날짜 처리
  if (isNaN(date.getTime())) {
    console.error(`Invalid date string: ${dateString}`);
    return dateString;
  }

  const getDateKey = (value: Date) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: APP_TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(value);

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);

  const todayKey = getDateKey(today);
  const yesterdayKey = getDateKey(yesterday);
  const dateKey = getDateKey(date);

  if (dateKey === todayKey) {
    return "오늘";
  } else if (dateKey === yesterdayKey) {
    return "어제";
  } else {
    return new Intl.DateTimeFormat("ko-KR", {
      timeZone: APP_TIMEZONE,
      year: "2-digit",
      month: "2-digit",
      day: "2-digit",
      weekday: "long",
    }).format(date);
  }
};
