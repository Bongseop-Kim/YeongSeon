#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(__dirname, "..");
const outputPath = path.join(
  workspaceRoot,
  "supabase/seeds/00_reference_snapshot.sql",
);
const pageSize = 1000;

const tableDefinitions = [
  {
    tableName: "admin_settings",
    columns: ["key", "value"],
    orderBy: "key",
    requiresAdminSession: true,
  },
  {
    tableName: "pricing_constants",
    columns: ["key", "amount", "category"],
    orderBy: "key",
  },
  {
    tableName: "products",
    columns: [
      "id",
      "code",
      "name",
      "price",
      "image",
      "category",
      "color",
      "pattern",
      "material",
      "info",
      "detail_images",
      "stock",
      "option_label",
    ],
    orderBy: "id",
  },
  {
    tableName: "product_options",
    columns: ["id", "product_id", "name", "additional_price", "stock"],
    orderBy: "product_id, name, id",
  },
];

const parseDotEnv = (content) => {
  const parsed = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    const quote = value[0];
    const isQuoted = (quote === '"' || quote === "'") && value.at(-1) === quote;

    parsed[key] = isQuoted ? value.slice(1, -1) : value;
  }

  return parsed;
};

const loadDotEnvIfExists = (relativePath) => {
  const envPath = path.join(workspaceRoot, relativePath);

  if (!fs.existsSync(envPath)) {
    return;
  }

  const parsed = parseDotEnv(fs.readFileSync(envPath, "utf8"));

  for (const [key, value] of Object.entries(parsed)) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
};

const loadCloudEnv = () => {
  loadDotEnvIfExists("apps/store/.env.supabase.cloud");
  loadDotEnvIfExists("e2e/.env");
};

export const escapeSqlLiteral = (value) =>
  `'${String(value).replaceAll("'", "''")}'`;

export const serializeSqlValue = (value) => {
  if (value === null || value === undefined) {
    return "NULL";
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(`Cannot serialize non-finite number: ${value}`);
    }

    return String(value);
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  if (Array.isArray(value)) {
    return `ARRAY[${value.map((item) => serializeSqlValue(item)).join(",")}]`;
  }

  if (typeof value === "object") {
    return `${escapeSqlLiteral(JSON.stringify(value))}::jsonb`;
  }

  return escapeSqlLiteral(value);
};

const buildInsertStatement = ({ tableName, columns }, rows) => {
  if (!rows?.length) {
    return `-- public.${tableName}: no rows`;
  }

  const rowValues = rows.map((row) => {
    const values = columns.map((column) => serializeSqlValue(row[column]));
    return `  (${values.join(", ")})`;
  });

  return [
    `INSERT INTO public.${tableName} (${columns.join(", ")})`,
    "VALUES",
    `${rowValues.join(",\n")};`,
  ].join("\n");
};

export const buildReferenceSeedSql = (dataByTable) => {
  const statements = [
    "SET check_function_bodies = off;",
    "",
    "TRUNCATE TABLE public.product_options, public.products, public.pricing_constants, public.admin_settings RESTART IDENTITY CASCADE;",
    "",
  ];

  for (const tableDefinition of tableDefinitions) {
    statements.push(
      buildInsertStatement(
        tableDefinition,
        dataByTable[tableDefinition.tableName] ?? [],
      ),
      "",
    );
  }

  statements.push(
    "SELECT setval('public.products_id_seq', COALESCE((SELECT max(id) FROM public.products), 1), true);",
    "",
  );

  return statements.join("\n");
};

const queryJson = (dbUrl, sql) => {
  const output = execFileSync(
    "psql",
    [dbUrl, "-X", "-q", "-t", "-A", "-c", sql],
    { encoding: "utf8" },
  );
  const trimmed = output.trim();

  if (!trimmed) {
    return [];
  }

  return JSON.parse(trimmed);
};

const fetchTable = (dbUrl, { tableName, columns, orderBy }) => {
  const sql = `
    SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
    FROM (
      SELECT ${columns.join(", ")}
      FROM public.${tableName}
      ORDER BY ${orderBy}
    ) AS t;
  `;

  return queryJson(dbUrl, sql);
};

const buildRestPath = ({ tableName, columns, orderBy }, offset) => {
  const searchParams = new URLSearchParams({
    select: columns.join(","),
    limit: String(pageSize),
    offset: String(offset),
    order: orderBy
      .split(",")
      .map((column) => `${column.trim()}.asc`)
      .join(","),
  });

  return `/rest/v1/${tableName}?${searchParams.toString()}`;
};

const fetchRestJson = async ({ supabaseUrl, anonKey, accessToken, path }) => {
  const response = await fetch(`${supabaseUrl}${path}`, {
    headers: {
      apikey: anonKey,
      authorization: `Bearer ${accessToken ?? anonKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(
      `REST request failed: ${response.status} ${await response.text()}`,
    );
  }

  return response.json();
};

const fetchRestTable = async (config, tableDefinition) => {
  const rows = [];

  for (let offset = 0; ; offset += pageSize) {
    const page = await fetchRestJson({
      ...config,
      path: buildRestPath(tableDefinition, offset),
    });

    rows.push(...page);

    if (page.length < pageSize) {
      return rows;
    }
  }
};

const signInWithPassword = async ({
  supabaseUrl,
  anonKey,
  email,
  password,
}) => {
  const response = await fetch(
    `${supabaseUrl}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: {
        apikey: anonKey,
        authorization: `Bearer ${anonKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    },
  );

  if (!response.ok) {
    throw new Error(
      `Admin sign-in failed: ${response.status} ${await response.text()}`,
    );
  }

  return response.json();
};

const getRestConfig = async () => {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const anonKey =
    process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error(
      "SUPABASE_URL/SUPABASE_ANON_KEY or VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY is required.",
    );
  }

  const adminEmail =
    process.env.SUPABASE_ADMIN_EMAIL ?? process.env.TEST_ADMIN_EMAIL;
  const adminPassword =
    process.env.SUPABASE_ADMIN_PASSWORD ?? process.env.TEST_ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    throw new Error(
      "SUPABASE_ADMIN_EMAIL/SUPABASE_ADMIN_PASSWORD or TEST_ADMIN_EMAIL/TEST_ADMIN_PASSWORD is required for admin_settings.",
    );
  }

  const session = await signInWithPassword({
    supabaseUrl,
    anonKey,
    email: adminEmail,
    password: adminPassword,
  });

  return { supabaseUrl, anonKey, accessToken: session.access_token };
};

const fetchDataByRest = async () => {
  const config = await getRestConfig();
  const entries = [];

  for (const tableDefinition of tableDefinitions) {
    const tableConfig = tableDefinition.requiresAdminSession
      ? config
      : { ...config, accessToken: undefined };
    entries.push([
      tableDefinition.tableName,
      await fetchRestTable(tableConfig, tableDefinition),
    ]);
  }

  return Object.fromEntries(entries);
};

const fetchDataByDbUrl = (dbUrl) =>
  Object.fromEntries(
    tableDefinitions.map((tableDefinition) => [
      tableDefinition.tableName,
      fetchTable(dbUrl, tableDefinition),
    ]),
  );

const pullReferenceSeed = async () => {
  if (process.argv.includes("--cloud")) {
    loadCloudEnv();
  }

  const dbUrl = process.env.SUPABASE_DB_URL;

  const dataByTable = dbUrl ? fetchDataByDbUrl(dbUrl) : await fetchDataByRest();

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, buildReferenceSeedSql(dataByTable));
  console.log(`Wrote ${path.relative(workspaceRoot, outputPath)}`);
  console.log(
    tableDefinitions
      .map(({ tableName }) => `${tableName}: ${dataByTable[tableName].length}`)
      .join(", "),
  );
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    await pullReferenceSeed();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
