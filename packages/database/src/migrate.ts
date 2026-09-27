import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { loadEnvFile } from "node:process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import postgres from "postgres";

for (const candidate of [".env.local", "../../.env.local", ".env"]) {
  const path = resolve(candidate);
  if (existsSync(path)) {
    loadEnvFile(path);
    break;
  }
}

const databaseUrl =
  process.env.SUPABASE_DATABASE_URL ?? process.env.DATABASE_URL;
if (databaseUrl === undefined) {
  throw new Error("DATABASE_URL is required");
}

const isSupabase =
  databaseUrl.includes("supabase.com") || databaseUrl.includes("supabase.co");
const sql = postgres(databaseUrl, {
  max: 1,
  prepare: false,
  ssl: isSupabase ? "require" : false,
});
const migrationsUrl = new URL("../migrations/", import.meta.url);
const migrationsPath = fileURLToPath(migrationsUrl);

try {
  await sql`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  const files = (await readdir(migrationsPath))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const [existing] = await sql<{ readonly name: string }[]>`
      SELECT name FROM schema_migrations WHERE name = ${file}
    `;
    if (existing !== undefined) continue;

    const migration = await readFile(new URL(file, migrationsUrl), "utf8");
    await sql.begin(async (transaction) => {
      await transaction.unsafe(migration);
      await transaction`
        INSERT INTO schema_migrations (name) VALUES (${file})
      `;
    });
    console.log(`Applied ${file}`);
  }
} finally {
  await sql.end();
}
