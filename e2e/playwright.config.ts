import { defineConfig } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const defaultStoreBaseURL = "http://127.0.0.1:5173";
const defaultAdminBaseURL = "http://127.0.0.1:5174";

const storeBaseURL =
  process.env.PLAYWRIGHT_STORE_BASE_URL ??
  process.env.STORE_BASE_URL ??
  defaultStoreBaseURL;
const adminBaseURL =
  process.env.PLAYWRIGHT_ADMIN_BASE_URL ??
  process.env.ADMIN_BASE_URL ??
  defaultAdminBaseURL;

const isLocalBaseURL = (value: string) => {
  const { hostname } = new URL(value);
  return hostname === "127.0.0.1" || hostname === "localhost";
};

const getRequestedProjects = () => {
  const projects = new Set<string>();
  const projectFlag = "--project";

  for (const [index, arg] of process.argv.entries()) {
    if (arg.startsWith(`${projectFlag}=`)) {
      for (const name of arg.slice(projectFlag.length + 1).split(",")) {
        if (name) {
          projects.add(name);
        }
      }
    }

    if (arg === projectFlag) {
      const nextArg = process.argv[index + 1];

      if (nextArg) {
        for (const name of nextArg.split(",")) {
          if (name) {
            projects.add(name);
          }
        }
      }
    }
  }

  const lifecycleEvent = process.env.npm_lifecycle_event;

  if (projects.size === 0 && lifecycleEvent === "test:e2e:store") {
    projects.add("store");
  }

  if (projects.size === 0 && lifecycleEvent === "test:e2e:admin") {
    projects.add("admin");
  }

  return projects;
};

const requestedProjects = getRequestedProjects();
const shouldRunStoreServer =
  requestedProjects.size === 0 || requestedProjects.has("store");
const shouldRunAdminServer =
  requestedProjects.size === 0 || requestedProjects.has("admin");

const webServer = [
  ...(shouldRunStoreServer && isLocalBaseURL(storeBaseURL)
    ? [
        {
          command: "pnpm dev:store",
          url: storeBaseURL,
          reuseExistingServer: !process.env.CI,
          stdout: "pipe" as const,
          stderr: "pipe" as const,
          timeout: 120_000,
        },
      ]
    : []),
  ...(shouldRunAdminServer && isLocalBaseURL(adminBaseURL)
    ? [
        {
          command: "pnpm dev:admin",
          url: adminBaseURL,
          reuseExistingServer: !process.env.CI,
          stdout: "pipe" as const,
          stderr: "pipe" as const,
          timeout: 120_000,
        },
      ]
    : []),
];

export default defineConfig({
  testDir: __dirname,
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  globalSetup: path.join(__dirname, "global-setup.ts"),
  outputDir: path.join(process.cwd(), "output/playwright/test-results"),
  use: {
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  webServer: webServer.length > 0 ? webServer : undefined,
  projects: [
    {
      name: "store",
      testMatch: /store\/.*\.spec\.ts$/,
      use: {
        baseURL: storeBaseURL,
        storageState: path.join(__dirname, ".auth/store.json"),
      },
    },
    {
      name: "admin",
      testMatch: /admin\/.*\.spec\.ts$/,
      use: {
        baseURL: adminBaseURL,
        storageState: path.join(__dirname, ".auth/admin.json"),
      },
    },
  ],
});
