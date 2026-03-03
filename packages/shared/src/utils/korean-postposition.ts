/**
 * 마지막 음절의 받침 유무에 따라 "으로" 또는 "로"를 반환한다.
 * - 받침 없음(종성 0) 또는 ㄹ 받침(종성 8): "로"
 * - 그 외 받침: "으로"
 * - 한글이 아닌 경우: "으로" (안전 폴백)
 */
export function eulo(word: string): string {
  if (!word) return "으로";
  const lastChar = word[word.length - 1];
  const code = lastChar.charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) return "으로";
  const jongseong = code % 28;
  // jongseong === 0: 받침 없음, jongseong === 8: ㄹ 받침
  return jongseong === 0 || jongseong === 8 ? "로" : "으로";
}
