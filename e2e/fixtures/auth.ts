import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test as base, type Page } from "@playwright/test";

type AuthFixtures = {
  authenticatedPage: Page;
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const authDir = path.join(__dirname, "..", ".auth");

const hasSessionEnv = (name: "store" | "admin") => {
  const prefix = name.toUpperCase();

  const hasEnv = Boolean(
    (process.env[`TEST_${prefix}_ACCESS_TOKEN`] &&
      process.env[`TEST_${prefix}_REFRESH_TOKEN`]) ||
    (process.env[`TEST_${prefix}_EMAIL`] &&
      process.env[`TEST_${prefix}_PASSWORD`]),
  );

  if (hasEnv) return true;

  // globalSetup이 이미 실행되어 .auth/*.meta.json이 존재하면 auth가 설정된 것으로 간주
  return fs.existsSync(path.join(authDir, `${name}.meta.json`));
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
