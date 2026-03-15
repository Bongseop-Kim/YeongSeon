import { expect, test as base, type Page } from "@playwright/test";

type AuthFixtures = {
  authenticatedPage: Page;
};

const hasSessionEnv = (name: "store" | "admin") => {
  const prefix = name.toUpperCase();

  return Boolean(
    (process.env[`TEST_${prefix}_ACCESS_TOKEN`] &&
      process.env[`TEST_${prefix}_REFRESH_TOKEN`]) ||
    (process.env[`TEST_${prefix}_EMAIL`] &&
      process.env[`TEST_${prefix}_PASSWORD`]),
  );
};

export const hasConfiguredAuth = hasSessionEnv;

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    await use(page);
  },
});

export const expectAuthenticatedRoute = async (
  page: Page,
  loginPath = "/login",
) => {
  await expect(page).not.toHaveURL(new RegExp(`${loginPath}$`));
};

export { expect };
