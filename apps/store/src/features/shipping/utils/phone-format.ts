/**
 * 전화번호에서 숫자만 추출
 */
export const extractPhoneNumber = (phone: string): string => {
  return phone.replace(/\D/g, "");
};

/**
 * 전화번호를 010-0000-0000 형식으로 포맷팅
 */
export const formatPhoneNumber = (phone: string): string => {
  const numbers = extractPhoneNumber(phone);

  if (numbers.length <= 3) {
    return numbers;
  } else if (numbers.length <= 7) {
    return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
  } else if (numbers.length <= 11) {
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`;
  } else {
    // 11자리 초과 시 앞 11자리만 사용
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(
      7,
      11
    )}`;
  }
};
