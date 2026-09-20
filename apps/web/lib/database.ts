import { createPostgresStore } from "@usekratose/database";

export function serverDatabaseUrl(): string | null {
  return process.env.SUPABASE_DATABASE_URL ?? process.env.DATABASE_URL ?? null;
}

export function createServerDatabase() {
  const databaseUrl = serverDatabaseUrl();
  if (databaseUrl === null) return null;
  return createPostgresStore(databaseUrl, { maxConnections: 1 });
}
