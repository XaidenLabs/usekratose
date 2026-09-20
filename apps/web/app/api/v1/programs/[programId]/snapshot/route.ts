import { withApiAuth } from "@/lib/api-server";
import { loadProgramContext } from "@/lib/program-query";
import { serializeSnapshot } from "@/lib/serialize";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ programId: string }> },
): Promise<Response> {
  return withApiAuth(request, async ({ key, store }) => {
    const { programId } = await context.params;
    const result = await loadProgramContext(store, programId, key.projectId);
    const snapshot = result?.snapshots[0];
    if (result === null || snapshot === undefined) {
      return Response.json(
        { error: { code: "NOT_FOUND", message: "Snapshot not found" } },
        { status: 404 },
      );
    }
    return Response.json({ data: serializeSnapshot(snapshot) });
  });
}
