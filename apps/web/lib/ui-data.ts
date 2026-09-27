import { redirect } from "next/navigation";
import { cache } from "react";

import { getUserProject, requireSession } from "./auth";
import { createServerDatabase } from "./database";
import { loadProgramContext } from "./program-query";

export const getDashboardData = cache(async () => {
  const session = await requireSession();
  const project = await getUserProject(session.id);
  if (project === null) redirect("/onboarding");
  const projectId = project.id;

  const database = createServerDatabase();
  if (database === null) {
    return { metrics: {}, programs: [], project, session };
  }
  try {
    const [programs, metrics] = await Promise.all([
      database.store.listProgramsForProject(projectId),
      database.store.metricCounts({ projectId }),
    ]);
    return { metrics, programs, project, session };
  } finally {
    await database.close();
  }
});

export async function getLatestPublicActivity(limit = 2) {
  const database = createServerDatabase();
  if (database === null) return [];
  try {
    return await database.store.listRecentPublicSecurityActivity(limit);
  } catch (error) {
    console.error("Failed to load public security activity", { error });
    return [];
  } finally {
    await database.close();
  }
}

export async function getAlertSettingsData() {
  const session = await requireSession();
  const project = await getUserProject(session.id);
  if (project === null) redirect("/onboarding");
  const database = createServerDatabase();
  if (database === null) return { destinations: [], project };
  try {
    const destinations = await database.store.listAlertDestinations(project.id);
    return { destinations, project };
  } finally {
    await database.close();
  }
}

export async function getApiSettingsData() {
  const session = await requireSession();
  const project = await getUserProject(session.id);
  if (project === null) redirect("/onboarding");
  const database = createServerDatabase();
  if (database === null) return { apiKeys: [], programs: [], project };
  try {
    const [apiKeys, programs] = await Promise.all([
      database.store.listApiKeys(project.id),
      database.store.listProgramsForProject(project.id),
    ]);
    return { apiKeys, programs, project };
  } finally {
    await database.close();
  }
}

export async function getPublicProgram(identifier: string) {
  const database = createServerDatabase();
  if (database === null) return null;
  try {
    const result = await loadProgramContext(database.store, identifier);
    if (result === null) return null;
    const [claim, explanations] = await Promise.all([
      database.store.getVerifiedClaim(result.program.id),
      database.store.listExplanationsForProgram(result.program.id),
      database.store.recordMetric({
        metricName: "public_profile_views",
        programId: result.program.id,
      }),
    ]);
    return { ...result, claim, explanations };
  } finally {
    await database.close();
  }
}
