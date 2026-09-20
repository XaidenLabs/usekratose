export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET(): Response {
  const databaseConfigured =
    process.env.SUPABASE_DATABASE_URL !== undefined ||
    process.env.DATABASE_URL !== undefined;
  return Response.json({
    configuration: {
      database: databaseConfigured,
      supabasePublic:
        process.env.NEXT_PUBLIC_SUPABASE_URL !== undefined &&
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY !== undefined,
    },
    milestone: 9,
    service: "usekratose-web",
    status: databaseConfigured ? "ready" : "degraded",
  });
}
