import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";
import { getCorsHeaders } from "@/functions/_shared/cors.ts";
import { createJsonResponse } from "@/functions/_shared/response.ts";
import { createLogger } from "@/functions/_shared/logger.ts";
import { sendSms } from "@/functions/_shared/solapi.ts";

const { processLogger, errorLogger } = createLogger("send-phone-verification");

const isValidKoreanPhone = (phone: string): boolean =>
  /^01[0-9]{8,9}$/.test(phone.replace(/-/g, ""));

const normalizePhone = (phone: string): string => phone.replace(/-/g, "");

const generateOtp = (): string => {
  const randomBuffer = new Uint32Array(1);
  crypto.getRandomValues(randomBuffer);
  return (randomBuffer[0] % 1_000_000).toString().padStart(6, "0");
};

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("Origin"));
  const jsonResponse = createJsonResponse(corsHeaders);

  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST")
    return jsonResponse(405, { error: "Method not allowed" });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return jsonResponse(401, { error: "Unauthorized" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse(500, { error: "Missing configuration" });
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser();
  if (authError || !user) return jsonResponse(401, { error: "Unauthorized" });

  let phone: string;
  try {
    const body = await req.json();
    phone = body?.phone ?? "";
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body" });
  }

  const normalizedPhone = normalizePhone(phone);
  if (!isValidKoreanPhone(normalizedPhone)) {
    return jsonResponse(400, { error: "유효하지 않은 휴대폰 번호입니다" });
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data: verificationResult, error: verificationError } =
    await userClient.rpc("create_phone_verification", {
      p_phone: normalizedPhone,
      p_today_start: todayStart.toISOString(),
      p_code: generateOtp(),
    });

  if (verificationError || !verificationResult) {
    const message =
      verificationError?.message ?? "인증번호 생성에 실패했습니다";
    if (
      message === "1분 후 재전송 가능합니다" ||
      message === "오늘 인증 시도 횟수를 초과했습니다"
    ) {
      return jsonResponse(429, { error: message });
    }

    errorLogger("create_verification_failed", verificationError, {
      userId: user.id,
    });
    return jsonResponse(500, { error: "인증번호 생성에 실패했습니다" });
  }

  const verification = verificationResult as {
    id?: string;
    code?: string;
  } | null;
  const verificationId = verification?.id ?? null;
  const code = verification?.code ?? null;

  if (!verificationId || !code) {
    errorLogger("create_verification_invalid_response", null, {
      userId: user.id,
      verificationResult,
    });
    return jsonResponse(500, { error: "인증번호 생성에 실패했습니다" });
  }

  const sent = await sendSms(
    normalizedPhone,
    `[ESSE SION] 인증번호는 [${code}]입니다. 5분 내에 입력해주세요.`,
  );

  if (!sent) {
    // SMS 실패 시 레코드 삭제 — 일일 카운트와 재전송 대기시간이 소모되지 않도록
    await adminClient
      .from("phone_verifications")
      .delete()
      .eq("id", verificationId);
    errorLogger("sms_failed", new Error("SMS send failed"), {
      userId: user.id,
    });
    return jsonResponse(502, {
      error: "문자 발송에 실패했습니다. 다시 시도해주세요.",
    });
  }

  processLogger("otp_sent", {
    userId: user.id,
    phone: normalizedPhone.slice(0, 4) + "****",
  });
  return jsonResponse(200, { message: "인증번호가 발송되었습니다" });
});
