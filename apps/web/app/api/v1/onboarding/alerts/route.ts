import { randomBytes } from "node:crypto";

import { assertSafeWebhookUrl, encryptSecret } from "@usekratose/alerts";
import { z } from "zod";

import { getSession } from "@/lib/auth";
import { createServerDatabase } from "@/lib/database";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const bodySchema = z.object({
  webhookUrl: z.union([z.literal(""), z.string().trim().url()]),
});

export async function POST(request: Request): Promise<Response> {
  const session = await getSession();
  if (session === null) {
    return Response.json(
      { error: { message: "Unauthorized" } },
      { status: 401 },
    );
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: { message: "A valid webhook URL is required" } },
      { status: 400 },
    );
  }
  if (parsed.data.webhookUrl === "") {
    return Response.json({ skipped: true, success: true });
  }

  let destination: string;
  try {
    destination = assertSafeWebhookUrl(parsed.data.webhookUrl).toString();
  } catch (error) {
    return Response.json(
      { error: { message: String(error) } },
      { status: 422 },
    );
  }

  const encryptionKey = process.env.ALERT_SECRET_ENCRYPTION_KEY;
  const database = createServerDatabase();
  if (database === null || encryptionKey === undefined) {
    return Response.json(
      { error: { message: "Alert storage is not configured" } },
      { status: 503 },
    );
  }

  try {
    const project = await database.store.getProjectForUser(session.id);
    if (project === null) {
      return Response.json(
        { error: { message: "Complete project onboarding first" } },
        { status: 409 },
      );
    }
    const signingSecret = randomBytes(32).toString("base64url");
    await database.store.createAlertDestination({
      destination,
      minSeverity: "high",
      projectId: project.id,
      secretCiphertext: encryptSecret(signingSecret, encryptionKey),
      type: "webhook",
    });
    return Response.json({ signingSecret, success: true }, { status: 201 });
  } finally {
    await database.close();
  }
}
