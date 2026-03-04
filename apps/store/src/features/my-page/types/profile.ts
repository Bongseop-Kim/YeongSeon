export interface MarketingConsent {
  all: boolean;
  channels: {
    sms: boolean;
    email: boolean;
    [channel: string]: boolean;
  };
}

export interface MarketingConsentToggleInput {
  target: "all" | "sms" | "email";
  checked: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  phone: string | null;
  birth: string | null;
  email: string;
  marketingConsent: MarketingConsent;
}
