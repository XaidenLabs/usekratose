import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function PATCH(request: Request): Promise<Response> {
  const body = (await request.json().catch(() => null)) as { readonly avatarUrl?: unknown; readonly displayName?: unknown } | null;
  if (body === null || typeof body.displayName !== "string" || body.displayName.trim().length < 2 || (body.avatarUrl !== undefined && typeof body.avatarUrl !== "string")) {
    return Response.json({ error: "A valid display name and avatar URL are required" }, { status: 400 });
  }
  const avatarUrl = typeof body.avatarUrl === "string" && body.avatarUrl.trim() !== "" ? body.avatarUrl.trim() : null;
  if (avatarUrl !== null) {
    try { new URL(avatarUrl); } catch { return Response.json({ error: "Avatar URL is invalid" }, { status: 400 }); }
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ data: { avatar_url: avatarUrl, full_name: body.displayName.trim() } });
  return error === null ? Response.json({ updated: true }) : Response.json({ error: error.message }, { status: 400 });
}
