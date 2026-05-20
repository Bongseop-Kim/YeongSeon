#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultRoot = path.resolve(__dirname, "..");
const apps = ["store", "admin"];
const appRuntimeKeys = {
  store: [
    "VITE_APP_ENV",
    "VITE_IMAGEKIT_URL_ENDPOINT",
    "VITE_IMAGEKIT_PUBLIC_KEY",
    "VITE_TOSS_CLIENT_KEY",
  ],
  admin: ["VITE_APP_ENV", "VITE_IMAGEKIT_URL_ENDPOINT", "VITE_IMAGEKIT_PUBLIC_KEY"],
};
const localFallback = {
  url: "http://127.0.0.1:54321",
  anonKey:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0",
};

const usage = `Usage:
  pnpm env:supabase:local
  pnpm env:supabase:cloud

Profiles are stored per app as apps/<app>/.env.supabase.<name>.`;

const parseArgs = (argv) => {
  const positional = [];
  const options = { root: defaultRoot };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (!arg.startsWith("--")) {
      positional.push(arg);
      continue;
    }

    const [rawKey, inlineValue] = arg.slice(2).split("=", 2);
    const key = rawKey.replace(/-([a-z])/g, (_, letter) =>
      letter.toUpperCase(),
    );
    const value = inlineValue ?? argv[index + 1];

    if (value === undefined || value.startsWith("--")) {
      throw new Error(`Missing value for --${rawKey}.`);
    }

    if (inlineValue === undefined) {
      index += 1;
    }

    options[key] = value;
  }

  return { positional, options };
};

const unquote = (value) => {
  const trimmed = value.trim();
  const quote = trimmed[0];

  if (
    trimmed.length >= 2 &&
    (quote === '"' || quote === "'") &&
    trimmed.at(-1) === quote
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
};

const parseEnv = (content) => {
  const entries = {};

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    entries[trimmed.slice(0, separatorIndex).trim()] = unquote(
      trimmed.slice(separatorIndex + 1),
    );
  }

  return entries;
};

const readEnvFile = (filePath) => {
  if (!fs.existsSync(filePath)) {
    return "";
  }

  return fs.readFileSync(filePath, "utf8");
};

const getAppEnvPath = (root, appName) =>
  path.join(root, "apps", appName, ".env");

const getProfilePath = (root, appName, profile) =>
  path.join(root, "apps", appName, `.env.supabase.${profile}`);

const stringifyEnv = (entries) =>
  `${Object.entries(entries)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n")}\n`;

const applyEnvValues = (content, values) => {
  const lines = content ? content.split(/\r?\n/) : [];
  const replacements = values;
  const seen = new Set();
  const nextLines = lines.map((line) => {
    const separatorIndex = line.indexOf("=");

    if (separatorIndex === -1) {
      return line;
    }

    const key = line.slice(0, separatorIndex).trim();

    if (!Object.prototype.hasOwnProperty.call(replacements, key)) {
      return line;
    }

    seen.add(key);
    return `${key}=${replacements[key]}`;
  });

  for (const [key, value] of Object.entries(replacements)) {
    if (!seen.has(key)) {
      nextLines.push(`${key}=${value}`);
    }
  }

  const normalized = nextLines.join("\n").replace(/\n*$/, "");
  return `${normalized}\n`;
};

const toSupabaseEntries = ({ url, anonKey }) => ({
  VITE_SUPABASE_URL: url,
  VITE_SUPABASE_ANON_KEY: anonKey,
});

const getProfileEntries = (root, appName, supabaseEnv, appEnv) => {
  const currentEntries = parseEnv(readEnvFile(getAppEnvPath(root, appName)));

  return {
    ...toSupabaseEntries(supabaseEnv),
    VITE_APP_ENV: appEnv,
    ...Object.fromEntries(
      appRuntimeKeys[appName]
        .filter((key) => key !== "VITE_APP_ENV" && currentEntries[key])
        .map((key) => [key, currentEntries[key]]),
    ),
  };
};

const writeProfile = (root, profile, supabaseEnv, appEnv = profile) => {
  for (const appName of apps) {
    fs.writeFileSync(
      getProfilePath(root, appName, profile),
      stringifyEnv(getProfileEntries(root, appName, supabaseEnv, appEnv)),
    );
  }
};

const writeActiveEnv = (root, supabaseEnv, appEnv) => {
  for (const appName of apps) {
    const envPath = getAppEnvPath(root, appName);
    const content = readEnvFile(envPath);
    fs.writeFileSync(
      envPath,
      applyEnvValues(content, {
        ...toSupabaseEntries(supabaseEnv),
        VITE_APP_ENV: appEnv,
      }),
    );
  }
};

const readProfile = (root, profile) => {
  const profileByApp = apps.map((appName) => {
    const profilePath = getProfilePath(root, appName, profile);

    if (!fs.existsSync(profilePath)) {
      throw new Error(
        `Missing ${path.relative(root, profilePath)}. Create it manually before switching to ${profile}.`,
      );
    }

    const entries = parseEnv(readEnvFile(profilePath));
    const url = entries.VITE_SUPABASE_URL;
    const anonKey = entries.VITE_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
      throw new Error(
        `${path.relative(root, profilePath)} must include VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.`,
      );
    }

    entries.VITE_APP_ENV ??= profile;

    return { appName, entries, url, anonKey };
  });

  const [first] = profileByApp;
  const mismatch = profileByApp.find(
    (entry) => entry.url !== first.url || entry.anonKey !== first.anonKey,
  );

  if (mismatch) {
    throw new Error(
      `Profile "${profile}" differs between store and admin. Refusing to switch partially.`,
    );
  }

  return profileByApp;
};

const applyProfile = (root, profileEntries) => {
  for (const { appName, entries } of profileEntries) {
    const envPath = getAppEnvPath(root, appName);
    fs.writeFileSync(envPath, applyEnvValues(readEnvFile(envPath), entries));
  }
};

const readSupabaseStatusEnv = (root) => {
  try {
    const output = execFileSync("supabase", ["status", "-o", "env"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    const entries = parseEnv(output);

    return {
      url: entries.API_URL,
      anonKey: entries.ANON_KEY,
    };
  } catch {
    return { url: undefined, anonKey: undefined };
  }
};

const getLocalSupabaseEnv = (root) => {
  const fromStatus = readSupabaseStatusEnv(root);

  return {
    url: process.env.SUPABASE_URL ?? fromStatus.url ?? localFallback.url,
    anonKey:
      process.env.SUPABASE_ANON_KEY ??
      fromStatus.anonKey ??
      localFallback.anonKey,
  };
};

const main = () => {
  const { positional, options } = parseArgs(process.argv.slice(2));
  const [command, profileArg] = positional;

  if (!command || command === "help" || command === "--help") {
    console.log(usage);
    return;
  }

  if (command === "local") {
    const supabaseEnv = getLocalSupabaseEnv(options.root);
    writeProfile(options.root, "local", supabaseEnv, "local");
    writeActiveEnv(options.root, supabaseEnv, "local");
    console.log(`Switched store/admin Supabase env to local: ${supabaseEnv.url}`);
    return;
  }

  const profileEntries = readProfile(options.root, command);
  applyProfile(options.root, profileEntries);
  console.log(
    `Switched store/admin Supabase env to ${command}: ${profileEntries[0].url}`,
  );
};

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  console.error(usage);
  process.exitCode = 1;
}
