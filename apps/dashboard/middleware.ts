import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { DASHBOARD_BASE_PATH, dashboardPath } from "@/lib/paths";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) return response;

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet)
          request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname.startsWith(DASHBOARD_BASE_PATH)
    ? request.nextUrl.pathname.slice(DASHBOARD_BASE_PATH.length) || "/"
    : request.nextUrl.pathname;
  const isAuthRoute = ["/login", "/signup"].includes(pathname);
  if (user === null && !isAuthRoute) {
    return NextResponse.redirect(new URL(dashboardPath("/login"), request.url));
  }
  if (user !== null && isAuthRoute) {
    return NextResponse.redirect(
      new URL(dashboardPath("/overview"), request.url),
    );
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/|brand/).*)"],
};
