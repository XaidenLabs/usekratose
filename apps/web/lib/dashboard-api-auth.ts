import { createClient, type User } from "@supabase/supabase-js";

function bearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  if (authorization === null) return null;
  const [scheme, token] = authorization.split(" ", 2);
  return scheme?.toLowerCase() === "bearer" && token !== undefined
    ? token
    : null;
}

export async function authenticateDashboardRequest(
  request: Request,
): Promise<User | null> {
  const token = bearerToken(request);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (token === null || !url || !publishableKey) return null;

  const supabase = createClient(url, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);
  return error === null ? user : null;
}

export function dashboardUnauthorized(): Response {
  return Response.json(
    { error: { code: "UNAUTHORIZED", message: "Valid user session required" } },
    { status: 401 },
  );
}
