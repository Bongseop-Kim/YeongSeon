import { supabase } from "@/lib/supabase";

const EMAIL_CODE_LENGTH = 6;
const AUTH_CALLBACK_PATH = "/auth/callback";

class EmailChangeError extends Error {
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "EmailChangeError";
    this.code = code;
  }
}

const toEmailChangeError = (error: unknown, fallback: string): EmailChangeError => {
  if (error instanceof Error) {
    const message = error.message || fallback;
    const lower = message.toLowerCase();

    if (lower.includes("expired")) {
      return new EmailChangeError("인증번호가 만료되었습니다. 다시 요청해주세요.", "email-code-expired");
    }
    if (lower.includes("invalid") || lower.includes("otp")) {
      return new EmailChangeError("인증번호가 올바르지 않습니다.", "email-code-invalid");
    }
    if (lower.includes("rate limit")) {
      return new EmailChangeError("요청이 너무 많습니다. 잠시 후 다시 시도해주세요.", "email-rate-limit");
    }
    if (lower.includes("already") && lower.includes("email")) {
      return new EmailChangeError("이미 사용 중인 이메일입니다.", "email-already-in-use");
    }

    return new EmailChangeError(message);
  }

  return new EmailChangeError(fallback);
};

const getEmailRedirectTo = () => `${window.location.origin}${AUTH_CALLBACK_PATH}`;

const ensureCurrentUser = async () => {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw toEmailChangeError(error, "사용자 정보를 불러오지 못했습니다.");
  }

  if (!user) {
    throw new EmailChangeError("로그인이 필요합니다.", "auth-required");
  }

  return user;
};

export const requestEmailChangeCode = async (nextEmail: string): Promise<void> => {
  const user = await ensureCurrentUser();

  if (user.email?.toLowerCase() === nextEmail.toLowerCase()) {
    throw new EmailChangeError("현재 이메일과 동일합니다.", "email-same-as-current");
  }

  const { error } = await supabase.auth.updateUser(
    { email: nextEmail },
    { emailRedirectTo: getEmailRedirectTo() },
  );

  if (error) {
    throw toEmailChangeError(error, "인증번호 요청에 실패했습니다.");
  }
};

export const resendEmailChangeCode = async (nextEmail: string): Promise<void> => {
  await ensureCurrentUser();

  const { error } = await supabase.auth.resend({
    type: "email_change",
    email: nextEmail,
    options: { emailRedirectTo: getEmailRedirectTo() },
  });

  if (error) {
    throw toEmailChangeError(error, "인증번호 재요청에 실패했습니다.");
  }
};

export const verifyEmailChangeCode = async (
  nextEmail: string,
  code: string,
): Promise<void> => {
  await ensureCurrentUser();

  const normalizedCode = code.trim();
  if (normalizedCode.length !== EMAIL_CODE_LENGTH) {
    throw new EmailChangeError("인증번호 6자리를 입력해주세요.", "email-code-length");
  }

  const { error } = await supabase.auth.verifyOtp({
    email: nextEmail,
    token: normalizedCode,
    type: "email_change",
  });

  if (error) {
    throw toEmailChangeError(error, "인증번호 검증에 실패했습니다.");
  }
};
