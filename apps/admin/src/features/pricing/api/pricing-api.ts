import { supabase } from "@/lib/supabase";
import type {
  PricingConstantRow,
  SampleDiscountKey,
  TokenTierUI,
} from "@/features/pricing/types/admin-pricing";

export async function getPricingConstants(): Promise<PricingConstantRow[]> {
  const { data, error } = await supabase
    .from("pricing_constants")
    .select("key, amount")
    .in("category", ["custom_order", "reform"])
    .order("key");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getFabricPrices(): Promise<PricingConstantRow[]> {
  const { data, error } = await supabase
    .from("pricing_constants")
    .select("key, amount")
    .eq("category", "fabric")
    .order("key");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getPricingRowsByKeys(
  keys: readonly string[],
): Promise<PricingConstantRow[]> {
  const { data, error } = await supabase
    .from("pricing_constants")
    .select("key, amount")
    .in("key", [...keys]);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function updatePricingConstant({
  key,
  amount,
}: PricingConstantRow): Promise<void> {
  const { error } = await supabase
    .from("pricing_constants")
    .update({ amount })
    .eq("key", key);
  if (error) throw new Error(error.message);
}

export async function upsertTokenPricing(tiers: TokenTierUI[]): Promise<void> {
  const rows: Array<PricingConstantRow & { category: "token" }> = tiers.flatMap(
    ({ priceKey, amountKey, price, amount }) => [
      { key: priceKey, amount: price, category: "token" },
      { key: amountKey, amount, category: "token" },
    ],
  );

  const { error } = await supabase
    .from("pricing_constants")
    .upsert(rows, { onConflict: "key" });
  if (error) throw new Error(error.message);
}

export async function getSampleCouponAmounts(
  keys: readonly SampleDiscountKey[],
): Promise<Record<SampleDiscountKey, number>> {
  const { data, error } = await supabase
    .from("pricing_constants")
    .select("key, amount")
    .eq("category", "sample_discount");
  if (error) throw new Error(error.message);

  const keySet = new Set<SampleDiscountKey>(keys);
  const result = Object.fromEntries(keys.map((key) => [key, 0])) as Record<
    SampleDiscountKey,
    number
  >;
  for (const row of data ?? []) {
    const key = row.key as SampleDiscountKey;
    if (keySet.has(key)) {
      result[key] = row.amount;
    }
  }
  return result;
}

export async function upsertSampleCouponAmounts(
  mutations: { key: SampleDiscountKey; amount: number }[],
): Promise<void> {
  const { error } = await supabase.from("pricing_constants").upsert(
    mutations.map(({ key, amount }) => ({
      key,
      amount,
      category: "sample_discount",
    })),
    { onConflict: "key" },
  );
  if (error) throw new Error(error.message);
}
