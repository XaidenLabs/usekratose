import { type User } from "@supabase/supabase-js";
import { deriveProgramSecurityStatus } from "@usekratose/core";

import {
  authenticateDashboardRequest,
  dashboardUnauthorized,
} from "@/lib/dashboard-api-auth";
import { createServerDatabase } from "@/lib/database";
import { serializeEvent, serializeSnapshot } from "@/lib/serialize";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function profileFor(user: User) {
  const metadata = user.user_metadata as Readonly<Record<string, unknown>>;
  const displayName =
    typeof metadata.full_name === "string"
      ? metadata.full_name
      : typeof metadata.name === "string"
        ? metadata.name
        : (user.email?.split("@")[0] ?? "UseKratose user");
  const avatarUrl =
    typeof metadata.avatar_url === "string" ? metadata.avatar_url : null;
  const providers = [
    ...new Set((user.identities ?? []).map((identity) => identity.provider)),
  ];

  return {
    avatarUrl,
    createdAt: user.created_at,
    displayName,
    email: user.email ?? "",
    emailVerified: user.email_confirmed_at != null,
    id: user.id,
    lastSignInAt: user.last_sign_in_at ?? null,
    mfaEnabled: (user.factors ?? []).some(
      (factor) => factor.status === "verified",
    ),
    providers,
    role: "Owner",
  };
}

export async function GET(request: Request): Promise<Response> {
  const user = await authenticateDashboardRequest(request);
  if (user === null) return dashboardUnauthorized();

  const database = createServerDatabase();
  if (database === null) {
    return Response.json(
      {
        error: { code: "CONFIGURATION_ERROR", message: "Database unavailable" },
      },
      { status: 503 },
    );
  }

  try {
    const project = await database.store.getProjectForUser(user.id);
    if (project === null) {
      return Response.json({
        data: { onboardingRequired: true, profile: profileFor(user) },
      });
    }

    const [programs, metrics, alertDestinations, apiKeys] = await Promise.all([
      database.store.listProgramMonitorsForProject(project.id),
      database.store.metricCounts({ projectId: project.id }),
      database.store.listAlertDestinations(project.id),
      database.store.listApiKeys(project.id),
    ]);
    const programEvidence = await Promise.all(
      programs.map(async ({ displayName, program }) => {
        const [snapshots, events] = await Promise.all([
          database.store.listSnapshots(program.id, 100),
          database.store.listSecurityEvents(program.id, 100),
        ]);
        return {
          currentSnapshot:
            snapshots[0] === undefined ? null : serializeSnapshot(snapshots[0]),
          eventCount: events.length,
          events: events.map(serializeEvent),
          latestEvent:
            events[0] === undefined ? null : serializeEvent(events[0]),
          displayName,
          program,
          securityStatus: deriveProgramSecurityStatus({
            hasPriorSnapshot: snapshots.length > 1,
            snapshot: snapshots[0] ?? null,
          }),
          snapshots: snapshots.map(serializeSnapshot),
          versionCount: snapshots.length,
        };
      }),
    );
    const recentEvents = programEvidence
      .flatMap((entry) =>
        entry.latestEvent === null
          ? []
          : [{ event: entry.latestEvent, program: entry.program }],
      )
      .sort((left, right) =>
        String(right.event.detectedAt).localeCompare(
          String(left.event.detectedAt),
        ),
      )
      .slice(0, 10);

    return Response.json({
      data: {
        alertDestinations,
        apiKeys,
        metrics,
        onboardingRequired: false,
        profile: profileFor(user),
        programs: programEvidence,
        recentEvents,
        workspace: project,
      },
    });
  } finally {
    await database.close();
  }
}
