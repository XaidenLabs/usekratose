import {
  deriveProgramSecurityStatus,
  type MonitoredProgram,
  type SecurityEvent,
  type VersionSnapshot,
} from "@usekratose/core";

export function serializeSnapshot(
  snapshot: VersionSnapshot,
): Record<string, unknown> {
  return {
    ...snapshot,
    deploymentSlot: snapshot.deploymentSlot.toString(),
    observedAt: snapshot.observedAt.toISOString(),
    observedSlot: snapshot.observedSlot.toString(),
  };
}

export function serializeEvent(event: SecurityEvent): Record<string, unknown> {
  return { ...event, detectedAt: event.detectedAt.toISOString() };
}

export function securityResponse(input: {
  readonly events: readonly SecurityEvent[];
  readonly program: MonitoredProgram;
  readonly snapshots: readonly VersionSnapshot[];
}): Record<string, unknown> {
  const [current] = input.snapshots;
  const latestEvent = input.events[0];
  return {
    currentHash: current?.executableHash ?? null,
    lastChange: latestEvent?.detectedAt.toISOString() ?? null,
    latestSeverity: latestEvent?.severity ?? null,
    monitoringStatus: input.program.monitoringStatus,
    network: input.program.cluster,
    program: input.program.address,
    programDataAddress: input.program.programDataAddress,
    status: deriveProgramSecurityStatus({
      hasPriorSnapshot: input.snapshots.length > 1,
      snapshot: current ?? null,
    }),
    upgradeAuthority: current?.upgradeAuthority ?? null,
    upgradeable: current?.upgradeAuthority !== null,
    verifiedHash: current?.trustedFingerprint ?? null,
  };
}
