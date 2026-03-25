import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";
import { timingSafeEqual } from "node:crypto";
import { getCorsHeaders } from "@/functions/_shared/cors.ts";
import { createJsonResponse } from "@/functions/_shared/response.ts";
import { createLogger } from "@/functions/_shared/logger.ts";

const { processLogger, errorLogger } = createLogger("verify-phone");
const DUMMY_CODE_BUFFER = new TextEncoder().encode("000000");

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

  let phone: string, code: string;
  try {
    const body = await req.json();
    phone = body?.phone ?? "";
    code = body?.code ?? "";
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body" });
  }

  if (!phone || !code) {
    return jsonResponse(400, { error: "phone and code are required" });
  }

  const normalizedPhone = phone.replace(/-/g, "");

  // 최신 미사용 OTP 조회
  const { data: verification, error: fetchError } = await adminClient
    .from("phone_verifications")
    .select("id, code, expires_at, verified")
    .eq("user_id", user.id)
    .eq("phone", normalizedPhone)
    .eq("verified", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fetchError) {
    errorLogger("fetch_failed", fetchError, { userId: user.id });
    return jsonResponse(500, { error: "인증 확인에 실패했습니다" });
  }

  if (!verification) {
    return jsonResponse(400, { error: "인증번호를 다시 요청해주세요" });
  }

  if (new Date(verification.expires_at) < new Date()) {
    return jsonResponse(400, { error: "인증번호가 만료되었습니다" });
  }

  const verificationCodeBuffer = new TextEncoder().encode(verification.code);
  const inputCodeBuffer = new TextEncoder().encode(code);

  if (verificationCodeBuffer.length !== inputCodeBuffer.length) {
    timingSafeEqual(DUMMY_CODE_BUFFER, DUMMY_CODE_BUFFER);
    return jsonResponse(400, { error: "인증번호가 일치하지 않습니다" });
  }

  if (!timingSafeEqual(verificationCodeBuffer, inputCodeBuffer)) {
    return jsonResponse(400, { error: "인증번호가 일치하지 않습니다" });
  }

  // OTP 사용 처리
  const { error: otpUpdateError } = await adminClient
    .from("phone_verifications")
    .update({ verified: true })
    .eq("id", verification.id)
    .eq("verified", false);

  if (otpUpdateError) {
    errorLogger("otp_mark_failed", otpUpdateError, { userId: user.id });
    return jsonResponse(500, { error: "인증 상태 업데이트에 실패했습니다" });
  }

  // profiles 업데이트 (phone + phone_verified)
  const { error: updateError } = await adminClient
    .from("profiles")
    .update({ phone: normalizedPhone, phone_verified: true })
    .eq("id", user.id);

  if (updateError) {
    errorLogger("profile_update_failed", updateError, { userId: user.id });
    return jsonResponse(500, { error: "프로필 업데이트에 실패했습니다" });
  }

  processLogger("verified", { userId: user.id });
  return jsonResponse(200, { message: "전화번호 인증이 완료되었습니다" });
});
