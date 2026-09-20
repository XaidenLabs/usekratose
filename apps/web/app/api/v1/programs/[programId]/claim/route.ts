import { z } from "zod";

import { withApiAuth } from "@/lib/api-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const schema = z.object({
  contact: z.string().trim().email(),
  evidence: z.string().trim().min(10).max(2000),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ programId: string }> },
): Promise<Response> {
  return withApiAuth(request, async ({ key, store }) => {
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return Response.json(
        { error: { code: "INVALID_REQUEST", issues: parsed.error.issues } },
        { status: 400 },
      );
    }
    const { programId } = await context.params;
    const program = await store.getProgramByIdentifier(programId);
    if (program === null) {
      return Response.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
    }
    const claim = await store.createProgramClaim({
      evidence: parsed.data,
      programId: program.id,
      projectId: key.projectId,
    });
    await store.recordMetric({
      metricName: "claimed_programs",
      programId: program.id,
      projectId: key.projectId,
    });
    return Response.json({ data: claim }, { status: 202 });
  });
}
