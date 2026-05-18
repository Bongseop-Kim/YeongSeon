import type { ContactMethod } from "@yeongseon/shared";

interface QuoteContactProfile {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
}

interface QuoteContactUser {
  email?: string | null;
  user_metadata?: unknown;
}

interface QuoteContactDefaultInput {
  profile?: QuoteContactProfile | null;
  user?: QuoteContactUser | null;
}

interface QuoteContactValueInput extends QuoteContactDefaultInput {
  method: ContactMethod;
}

interface QuoteContactDefaults {
  contactName: string;
  contactMethod: ContactMethod;
  contactValue: string;
}

const trim = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const getNestedString = (value: unknown, path: readonly string[]): string => {
  let current: unknown = value;
  for (const key of path) {
    if (!isRecord(current)) return "";
    current = current[key];
  }
  return trim(current);
};

export const getQuoteContactDefaults = ({
  profile,
  user,
}: QuoteContactDefaultInput): QuoteContactDefaults => {
  const contactName =
    trim(profile?.name) ||
    getNestedString(user?.user_metadata, ["name"]) ||
    trim(user?.email).split("@")[0] ||
    "";
  const phone = trim(profile?.phone);
  const email = trim(profile?.email) || trim(user?.email);

  if (phone) {
    return {
      contactName,
      contactMethod: "phone",
      contactValue: phone,
    };
  }

  return {
    contactName,
    contactMethod: "email",
    contactValue: email,
  };
};

export const getQuoteContactValueForMethod = ({
  method,
  profile,
  user,
}: QuoteContactValueInput): string => {
  if (method === "phone") return trim(profile?.phone);
  return trim(profile?.email) || trim(user?.email);
};
