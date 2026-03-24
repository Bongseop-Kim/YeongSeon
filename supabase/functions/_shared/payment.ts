export const maskPaymentKey = (key: string): string => {
  if (key.length <= 8) return "****";
  return `****${key.slice(-8)}`;
};
