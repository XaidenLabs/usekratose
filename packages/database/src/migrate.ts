import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;
if (databaseUrl === undefined) {
  throw new Error("DATABASE_URL is required");
}

const sql = postgres(databaseUrl, { max: 1, prepare: false });
const migrationUrl = new URL(
  "../migrations/0001_milestone_1.sql",
  import.meta.url,
);
const migration = await readFile(fileURLToPath(migrationUrl), "utf8");

try {
  await sql.unsafe(migration);
  console.log("Applied 0001_milestone_1.sql");
} finally {
  await sql.end();
}
