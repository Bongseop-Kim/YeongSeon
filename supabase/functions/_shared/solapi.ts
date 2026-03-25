// supabase/functions/_shared/solapi.ts

export type SolapiMessageType = "ATA" | "SMS"; // ATA = 알림톡

export type SolapiSendParams = {
  to: string; // 수신자 전화번호 (01012345678 형식)
  templateId: string; // 알림톡 템플릿 ID
  variables: Record<string, string>; // 템플릿 변수
  fallbackContent: string; // 알림톡 실패 시 SMS 본문
};

type SolapiResponse = {
  groupId?: string;
  [key: string]: unknown;
};

const makeSignature = async (
  secret: string,
  date: string,
  salt: string,
): Promise<string> => {
  const message = date + salt;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

const solapiRequest = async (
  apiKey: string,
  apiSecret: string,
  body: Record<string, unknown>,
): Promise<{ ok: boolean; groupId?: string; rawError?: string }> => {
  const date = new Date().toISOString();
  const salt = crypto.randomUUID();
  const signature = await makeSignature(apiSecret, date, salt);
  const authHeader = `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`;

  const res = await fetch("https://api.solapi.com/messages/v4/send", {
    method: "POST",
    headers: { Authorization: authHeader, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  const json = (await res.json()) as SolapiResponse;
  return {
    ok: res.ok,
    groupId: json.groupId,
    rawError: res.ok ? undefined : JSON.stringify(json),
  };
};

/**
 * Solapi로 알림톡 발송. 실패 시 SMS 대체발송.
 * 발송 실패는 throw하지 않고 false를 반환한다 (알림 실패가 비즈니스 로직을 막아서는 안 됨).
 */
export const sendAlimtalk = async (
  params: SolapiSendParams,
): Promise<boolean> => {
  const apiKey = Deno.env.get("SOLAPI_API_KEY");
  const apiSecret = Deno.env.get("SOLAPI_API_SECRET");
  const pfId = Deno.env.get("SOLAPI_PF_ID"); // 카카오 채널 ID
  const senderNumber = Deno.env.get("SOLAPI_SENDER_NUMBER");

  if (!apiKey || !apiSecret || !pfId) {
    console.error("[solapi] Missing SOLAPI env vars");
    return false;
  }
  if (!senderNumber) {
    console.error("[solapi] Missing SOLAPI_SENDER_NUMBER");
    return false;
  }

  const messageType: SolapiMessageType = "ATA";
  const body = {
    message: {
      to: params.to,
      from: senderNumber,
      text: params.fallbackContent,
      type: messageType,
      kakaoOptions: {
        pfId,
        templateId: params.templateId,
        variables: params.variables,
        disableSms: false, // 알림톡 실패 시 SMS 대체발송 허용
      },
    },
  };

  try {
    const { ok, groupId, rawError } = await solapiRequest(
      apiKey,
      apiSecret,
      body,
    );
    if (!ok) {
      console.error("[solapi] send failed", rawError);
      return false;
    }
    console.log("[solapi] sent", groupId);
    return true;
  } catch (err) {
    console.error("[solapi] fetch error", err);
    return false;
  }
};

/**
 * OTP 전용 SMS 발송 (알림톡 불필요)
 */
export const sendSms = async (
  to: string,
  content: string,
): Promise<boolean> => {
  const apiKey = Deno.env.get("SOLAPI_API_KEY");
  const apiSecret = Deno.env.get("SOLAPI_API_SECRET");
  const senderNumber = Deno.env.get("SOLAPI_SENDER_NUMBER");

  if (!apiKey || !apiSecret) {
    console.error("[solapi] Missing SOLAPI env vars");
    return false;
  }
  if (!senderNumber) {
    console.error("[solapi] Missing SOLAPI_SENDER_NUMBER");
    return false;
  }

  const messageType: SolapiMessageType = "SMS";
  const body = {
    message: {
      to,
      from: senderNumber,
      text: content,
      type: messageType,
    },
  };

  try {
    const { ok, groupId, rawError } = await solapiRequest(
      apiKey,
      apiSecret,
      body,
    );
    if (!ok) {
      console.error("[solapi] sms failed", rawError);
      return false;
    }
    console.log("[solapi] sms sent", groupId);
    return true;
  } catch (err) {
    console.error("[solapi] sms fetch error", err);
    return false;
  }
};
