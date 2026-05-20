import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scriptPath = path.join(__dirname, "switch-supabase-env.mjs");
const runScript = promisify(execFile);

const makeWorkspace = async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "ys-env-switch-"));

  await Promise.all([
    fs.mkdir(path.join(root, "apps/store"), { recursive: true }),
    fs.mkdir(path.join(root, "apps/admin"), { recursive: true }),
  ]);

  await Promise.all([
    fs.writeFile(
      path.join(root, "apps/store/.env"),
      [
        "VITE_SUPABASE_URL=https://cloud.example.supabase.co",
        "VITE_SUPABASE_ANON_KEY=cloud-anon",
        "VITE_IMAGEKIT_PUBLIC_KEY=imagekit",
        "",
      ].join("\n"),
    ),
    fs.writeFile(
      path.join(root, "apps/admin/.env"),
      [
        "VITE_SUPABASE_URL=https://cloud.example.supabase.co",
        "VITE_SUPABASE_ANON_KEY=cloud-anon",
        "VITE_IMAGEKIT_PUBLIC_KEY=imagekit",
        "",
      ].join("\n"),
    ),
  ]);

  return root;
};

const readEnv = async (root, appName) =>
  fs.readFile(path.join(root, `apps/${appName}/.env`), "utf8");

test("local switches store and admin Supabase env while preserving other values", async () => {
  const root = await makeWorkspace();

  await runScript("node", [scriptPath, "local", "--root", root]);

  assert.match(
    await readEnv(root, "store"),
    /VITE_SUPABASE_URL=http:\/\/127\.0\.0\.1:54321/,
  );
  assert.match(await readEnv(root, "store"), /VITE_APP_ENV=local/);
  assert.match(await readEnv(root, "store"), /VITE_IMAGEKIT_PUBLIC_KEY=imagekit/);
  assert.match(
    await readEnv(root, "admin"),
    /VITE_SUPABASE_URL=http:\/\/127\.0\.0\.1:54321/,
  );
  assert.match(await readEnv(root, "admin"), /VITE_APP_ENV=local/);
});

test("local writes app runtime env into store and admin profile files", async () => {
  const root = await makeWorkspace();

  await runScript("node", [scriptPath, "local", "--root", root]);

  assert.match(
    await fs.readFile(
      path.join(root, "apps/store/.env.supabase.local"),
      "utf8",
    ),
    /VITE_IMAGEKIT_PUBLIC_KEY=imagekit/,
  );
  assert.match(
    await fs.readFile(
      path.join(root, "apps/admin/.env.supabase.local"),
      "utf8",
    ),
    /VITE_IMAGEKIT_PUBLIC_KEY=imagekit/,
  );
});

test("set profile and profile switch restore store and admin Supabase env together", async () => {
  const root = await makeWorkspace();

  await runScript("node", [
    scriptPath,
    "set",
    "--url",
    "https://cloud.example.supabase.co",
    "--anon-key",
    "cloud-anon",
    "--profile",
    "cloud",
    "--root",
    root,
  ]);
  await runScript("node", [scriptPath, "local", "--root", root]);
  await runScript("node", [scriptPath, "cloud", "--root", root]);

  assert.match(
    await readEnv(root, "store"),
    /VITE_SUPABASE_URL=https:\/\/cloud\.example\.supabase\.co/,
  );
  assert.match(await readEnv(root, "store"), /VITE_APP_ENV=cloud/);
  assert.match(await readEnv(root, "store"), /VITE_SUPABASE_ANON_KEY=cloud-anon/);
  assert.match(
    await readEnv(root, "admin"),
    /VITE_SUPABASE_URL=https:\/\/cloud\.example\.supabase\.co/,
  );
  assert.match(await readEnv(root, "admin"), /VITE_APP_ENV=cloud/);
  assert.match(await readEnv(root, "admin"), /VITE_SUPABASE_ANON_KEY=cloud-anon/);
});
