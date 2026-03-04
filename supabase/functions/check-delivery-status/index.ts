import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";
import { corsHeaders } from "../_shared/cors.ts";

// 스마트택배 API 택배사 코드 매핑
const SWEET_TRACKER_CODES: Record<string, string> = {
  cj: "04",       // CJ대한통운
  hanjin: "05",   // 한진택배
  logen: "06",    // 로젠택배
  epost: "01",    // 우체국택배
  lotte: "08",    // 롯데택배
  kyungdong: "23", // 경동택배
};

interface SweetTrackerResponse {
  result: string;
  level: number; // 6 = 배달완료
  trackingDetails?: Array<{
    timeString: string;
    where: string;
    kind: string;
    level: number;
  }>;
}

interface OrderToCheck {
  id: string;
  courier_company: string;
  tracking_number: string;
}

Deno.serve(async (req: Request) => {
  // pg_cron에서 POST로 호출하므로 OPTIONS는 응답만
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const schedulerToken = Deno.env.get("SCHEDULER_BEARER_TOKEN");
  const authHeader = req.headers.get("Authorization");
  if (schedulerToken && authHeader !== `Bearer ${schedulerToken}`) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const sweetTrackerKey = Deno.env.get("SWEET_TRACKER_API_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(
      JSON.stringify({ error: "Missing Supabase environment variables" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (!sweetTrackerKey) {
    return new Response(
      JSON.stringify({ error: "Missing SWEET_TRACKER_API_KEY" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // 배송중인 주문 중 운송장번호가 있는 것만 조회
  const { data: orders, error: fetchError } = await supabase
    .from("orders")
    .select("id, courier_company, tracking_number")
    .eq("status", "배송중")
    .not("tracking_number", "is", null)
    .not("courier_company", "is", null);

  if (fetchError) {
    return new Response(
      JSON.stringify({ error: fetchError.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const ordersToCheck = (orders ?? []) as OrderToCheck[];
  let deliveredCount = 0;
  const errors: string[] = [];

  for (const order of ordersToCheck) {
    const trackerCode = SWEET_TRACKER_CODES[order.courier_company];
    if (!trackerCode) {
      // 매핑되지 않은 택배사는 건너뜀
      continue;
    }

    try {
      const apiUrl =
        `https://info.sweettracker.co.kr/api/v1/trackingInfo` +
        `?t_key=${encodeURIComponent(sweetTrackerKey)}` +
        `&t_code=${encodeURIComponent(trackerCode)}` +
        `&t_invoice=${encodeURIComponent(order.tracking_number)}`;

      const res = await fetch(apiUrl);
      if (!res.ok) {
        errors.push(`Order ${order.id}: HTTP ${res.status}`);
        continue;
      }

      const data: SweetTrackerResponse = await res.json();

      // level 6 = 배달완료
      if (data.level === 6) {
        const { data: updatedOrder, error: updateError } = await supabase
          .from("orders")
          .update({
            status: "배송완료",
            delivered_at: new Date().toISOString(),
          })
          .eq("id", order.id)
          .eq("status", "배송중") // 동시 호출 시 중복 전환 방지
          .select("id")
          .maybeSingle();

        if (updateError) {
          errors.push(`Order ${order.id}: ${updateError.message}`);
          continue;
        }

        if (!updatedOrder) {
          errors.push(`Order ${order.id}: status was not '배송중', skipped`);
          continue;
        }

        // 상태 로그 기록 (changed_by = null → 시스템 자동 전환)
        await supabase.from("order_status_logs").insert({
          order_id: order.id,
          changed_by: null,
          previous_status: "배송중",
          new_status: "배송완료",
          memo: "스마트택배 배달완료 자동 감지",
        });

        deliveredCount++;
      }
    } catch (err) {
      errors.push(`Order ${order.id}: ${String(err)}`);
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      checked: ordersToCheck.length,
      delivered: deliveredCount,
      errors: errors.length > 0 ? errors : undefined,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
