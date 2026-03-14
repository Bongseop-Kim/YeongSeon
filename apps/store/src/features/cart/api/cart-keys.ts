export const cartKeys = {
  all: ["cart"] as const,
  items: (userId?: string) => [...cartKeys.all, "items", userId] as const,
  guest: () => [...cartKeys.all, "guest"] as const,
};
