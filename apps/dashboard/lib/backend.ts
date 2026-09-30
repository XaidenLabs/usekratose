import { cache } from "react";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "./supabase-server";
import type { DashboardApiData, DashboardData } from "./types";

function canonicalOrigin(): string {
  const value =
    process.env.NEXT_PUBLIC_MARKETING_URL ??
    process.env.USEKRATOSE_API_URL ??
    process.env.NEXT_PUBLIC_USEKRATOSE_API_URL ??
    "http://localhost:3000";
  const url = new URL(value);
  if (
    url.username !== "" ||
    url.password !== "" ||
    (url.protocol !== "https:" && url.hostname !== "localhost")
  ) {
    throw new Error("UseKratose API origin must be HTTPS or localhost");
  }
  return url.origin;
}

export function backendUrl(path: string): string {
  return new URL(path, canonicalOrigin()).toString();
}

export function marketingUrl(path: string): string {
  return new URL(path, canonicalOrigin()).toString();
}

export const requireDashboardSession = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const [userResult, sessionResult] = await Promise.all([
    supabase.auth.getUser(),
    supabase.auth.getSession(),
  ]);
  const user = userResult.data.user;
  const accessToken = sessionResult.data.session?.access_token;
  if (user === null || accessToken === undefined) {
    redirect(marketingUrl("/login"));
  }
  return { accessToken, user };
});

export const getDashboardData = cache(async (): Promise<DashboardData> => {
  const { accessToken } = await requireDashboardSession();
  const response = await fetch(backendUrl("/api/v1/dashboard"), {
    cache: "no-store",
    headers: { authorization: `Bearer ${accessToken}` },
    redirect: "error",
    signal: AbortSignal.timeout(10_000),
  });
  if (response.status === 401) redirect(marketingUrl("/login"));
  if (!response.ok)
    throw new Error(`Dashboard API failed (${response.status})`);
  const body = (await response.json()) as { readonly data: DashboardApiData };
  if (body.data.onboardingRequired) {
    redirect("/onboarding");
  }
  return body.data;
});
