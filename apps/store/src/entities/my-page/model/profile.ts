export interface MarketingConsent {
  kakaoSms: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  phone: string | null;
  birth: string | null;
  email: string;
  marketingConsent: MarketingConsent;
  phoneVerified: boolean;
  notificationConsent: boolean;
  notificationEnabled: boolean;
}
