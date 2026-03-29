export type AppName = "store" | "admin";

export type AuthMeta = {
  appName: AppName;
  baseURL: string;
  accessToken: string;
  refreshToken: string;
  userId: string;
  email?: string;
};

export type E2EFixtures = {
  storeProduct: {
    id: number;
    name: string;
    price: number;
  };
  shippingAddress: {
    id: string;
    recipientName: string;
  };
  coupon: {
    id: string;
    name: string;
    discountValue: number;
  };
};

export const buildHeaders = (apiKey: string, accessToken?: string) => ({
  apikey: apiKey,
  Authorization: `Bearer ${accessToken ?? apiKey}`,
  "Content-Type": "application/json",
});
