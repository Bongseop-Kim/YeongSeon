import {
  readAuthMeta,
  buildHeaders,
  getSupabaseConfig,
  supabaseRequest,
} from "./store-data";

export type SeededQuoteRequest = {
  quoteRequestId: string;
  quoteNumber: string;
};

export const seedQuoteRequest = async (): Promise<SeededQuoteRequest> => {
  const { supabaseUrl, supabaseAnonKey } = await getSupabaseConfig();
  const storeMeta = await readAuthMeta("store");

  // 배송지 조회
  const shippingAddresses = await supabaseRequest<
    Array<{ id: string; is_default: boolean }>
  >({
    path: `/rest/v1/shipping_addresses?select=id,is_default&user_id=eq.${storeMeta.userId}&order=created_at.desc`,
    accessToken: storeMeta.accessToken,
  });

  const shippingAddress =
    shippingAddresses.find((a) => a.is_default) ?? shippingAddresses[0];

  if (!shippingAddress) {
    throw new Error("No shipping address found for E2E quote request seed.");
  }

  const response = await fetch(
    `${supabaseUrl}/functions/v1/create-quote-request`,
    {
      method: "POST",
      headers: buildHeaders(supabaseAnonKey, storeMeta.accessToken),
      body: JSON.stringify({
        shipping_address_id: shippingAddress.id,
        options: {
          fabricProvided: false,
          reorder: false,
          fabricType: "POLY",
          designType: "PRINTING",
          tieType: "AUTO",
          interlining: null,
          interliningThickness: "THICK",
          sizeType: "ADULT",
          tieWidth: 8,
          triangleStitch: true,
          sideStitch: true,
          barTack: false,
          fold7: false,
          dimple: false,
          spoderato: false,
          brandLabel: false,
          careLabel: false,
          quantity: 100,
          referenceImages: null,
          additionalNotes: "E2E 테스트 견적요청",
        },
        quantity: 100,
        contact_name: "E2E 테스터",
        contact_title: "QA",
        contact_method: "phone",
        contact_value: "010-1234-5678",
      }),
    },
  );

  if (!response.ok) {
    throw new Error(
      `create-quote-request failed: ${response.status} ${await response.text()}`,
    );
  }

  const result = (await response.json()) as {
    quote_request_id: string;
    quote_number: string;
  };

  return {
    quoteRequestId: result.quote_request_id,
    quoteNumber: result.quote_number,
  };
};

export const adminUpdateQuoteRequestStatus = async (
  quoteRequestId: string,
  newStatus: string,
  quotedAmount: number | null = null,
  quoteConditions: string | null = null,
  adminMemo: string | null = null,
  memo: string | null = null,
) => {
  const adminMeta = await readAuthMeta("admin");

  await supabaseRequest({
    path: "/rest/v1/rpc/admin_update_quote_request_status",
    method: "POST",
    accessToken: adminMeta.accessToken,
    body: {
      p_quote_request_id: quoteRequestId,
      p_new_status: newStatus,
      p_quoted_amount: quotedAmount,
      p_quote_conditions: quoteConditions,
      p_admin_memo: adminMemo,
      p_memo: memo,
    },
  });
};
