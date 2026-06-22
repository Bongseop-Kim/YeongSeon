// 텍스트의 {{TOKEN}} 자리표시자를 주어진 값으로 치환한다.
// 정적 안내 문구(FAQ·공지)에 서버에서 내려오는 동적 값(예: 배송비)을 주입할 때 사용.
// 매핑이 없는 토큰(예: 값 로딩 중)은 fallback으로 대체한다.
export const applyTemplateTokens = (
  text: string,
  tokens: Record<string, string | undefined>,
  fallback = "—",
): string =>
  text.replace(
    /\{\{\s*(\w+)\s*\}\}/g,
    (_match, key: string) => tokens[key] ?? fallback,
  );
