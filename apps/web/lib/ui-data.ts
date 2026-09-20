import { createServerDatabase } from "./database";
import { loadProgramContext } from "./program-query";

export async function getDashboardData() {
  const projectId = process.env.DEFAULT_PROJECT_ID ?? "demo";
  const database = createServerDatabase();
  if (database === null) {
    return { metrics: {}, programs: [], projectId };
  }
  try {
    const [programs, metrics] = await Promise.all([
      database.store.listProgramsForProject(projectId),
      database.store.metricCounts(),
    ]);
    return { metrics, programs, projectId };
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
