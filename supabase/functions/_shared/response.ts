export type JsonResponseFn = (
  status: number,
  body: Record<string, unknown>,
) => Response;

export const createJsonResponse =
  (corsHeaders: Record<string, string>): JsonResponseFn =>
  (status, body) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
