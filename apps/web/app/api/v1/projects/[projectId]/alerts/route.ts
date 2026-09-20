import { randomBytes } from "node:crypto";

import { assertSafeWebhookUrl, encryptSecret } from "@usekratose/alerts";
import { z } from "zod";

import { hasControlPlaneAccess } from "@/lib/api-server";
import { createServerDatabase } from "@/lib/database";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const schema = z.discriminatedUnion("type", [
  z.object({
    destination: z.string().url(),
    minSeverity: z
      .enum(["info", "low", "medium", "high", "critical"])
      .default("high"),
    type: z.literal("webhook"),
  }),
  z.object({
    destination: z.string().trim().min(1).max(200).default("in-app"),
    minSeverity: z
      .enum(["info", "low", "medium", "high", "critical"])
      .default("info"),
    type: z.literal("in_app"),
  }),
]);

export async function GET(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
): Promise<Response> {
  if (!hasControlPlaneAccess(request)) {
    return Response.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }
  const database = createServerDatabase();
  if (database === null) return Response.json({}, { status: 503 });
  try {
    const { projectId } = await context.params;
    const data = await database.store.listAlertDestinations(projectId);
    return Response.json({
      data: data.map(
        ({ secretCiphertext: _secret, ...destination }) => destination,
      ),
    });
  } finally {
    await database.close();
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
): Promise<Response> {
  if (!hasControlPlaneAccess(request)) {
    return Response.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }
  const encryptionKey = process.env.ALERT_SECRET_ENCRYPTION_KEY;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: { code: "INVALID_REQUEST", issues: parsed.error.issues } },
      { status: 400 },
    );
  }
  try {
    if (parsed.data.type === "webhook")
      assertSafeWebhookUrl(parsed.data.destination);
  } catch (error) {
    return Response.json(
      { error: { code: "UNSAFE_DESTINATION", message: String(error) } },
      { status: 422 },
    );
  }
  const database = createServerDatabase();
  if (database === null || encryptionKey === undefined) {
    return Response.json({}, { status: 503 });
  }
  try {
    const { projectId } = await context.params;
    const secret = randomBytes(32).toString("base64url");
    const created = await database.store.createAlertDestination({
      destination: parsed.data.destination,
      minSeverity: parsed.data.minSeverity,
      projectId,
      secretCiphertext: encryptSecret(secret, encryptionKey),
      type: parsed.data.type,
    });
    const { secretCiphertext: _secret, ...destination } = created;
    return Response.json(
      {
        data: {
          ...destination,
          ...(parsed.data.type === "webhook" ? { signingSecret: secret } : {}),
        },
        notice: "The webhook signing secret is shown only once.",
      },
      { status: 201 },
    );
  } finally {
    await database.close();
  }
}
