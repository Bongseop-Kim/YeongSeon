const safeStringify = (value: unknown): string => {
  try {
    return JSON.stringify(value);
  } catch {
    if (value instanceof Error) {
      return value.stack ?? value.message;
    }
    return String(value);
  }
};

/**
 * 지정한 접두사를 포함하는 콘솔 로거 쌍을 생성합니다.
 *
 * @param prefix 각 로그 메시지 앞에 붙일 식별자
 * @returns `processLogger(step, payload)` 와
 * `errorLogger(step, error, payload?)` 를 포함한 로거 객체입니다.
 * 두 메서드 모두 콘솔에 출력하며, `errorLogger` 의 `payload` 기본값은 빈 객체입니다.
 *
 * @param step 로그 단계 이름
 * @param payload 로그에 함께 기록할 부가 정보 객체
 * @param error 에러 로그에 기록할 원본 에러
 */
export const createLogger = (prefix: string) => ({
  processLogger: (step: string, payload: Record<string, unknown>) => {
    console.log(`[${prefix}:${step}]`, safeStringify(payload));
  },
  errorLogger: (
    step: string,
    error: unknown,
    payload: Record<string, unknown> = {},
  ) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      `[${prefix}:${step}]`,
      safeStringify({ ...payload, error: message }),
    );
  },
});
