import type { PostgresProgramStore } from "@usekratose/database";

export async function loadProgramContext(
  store: PostgresProgramStore,
  identifier: string,
  projectId?: string,
) {
  const program = await store.getProgramByIdentifier(identifier, projectId);
  if (program === null) return null;
  const [snapshots, events] = await Promise.all([
    store.listSnapshots(program.id),
    store.listSecurityEvents(program.id),
  ]);
  return { events, program, snapshots };
}
