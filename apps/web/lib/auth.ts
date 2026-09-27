import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "./supabase-server";
import { createServerDatabase } from "./database";

export interface SessionUser {
  readonly id: string;
  readonly email: string;
}

/**
 * Returns the current authenticated user, or null if not logged in.
 */
export async function getSession(): Promise<SessionUser | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) return null;
  return { id: user.id, email: user.email };
}

/**
 * Returns the current authenticated user, or redirects to /login.
 */
export async function requireSession(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

/**
 * Resolve the project for the authenticated user.
 * If no project exists yet, returns null (user needs onboarding).
 */
export async function getUserProject(
  userId: string,
): Promise<{ readonly id: string; readonly name: string } | null> {
  const database = createServerDatabase();
  if (database === null) return null;
  try {
    return await database.store.getProjectForUser(userId);
  } finally {
    await database.close();
  }
}
