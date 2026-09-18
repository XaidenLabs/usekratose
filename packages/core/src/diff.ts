import type {
  ChangeEventCandidate,
  ChangeEventType,
  SnapshotCandidate,
  VersionSnapshot,
} from "./domain.js";

export function diffSnapshots(
  previous: VersionSnapshot,
  next: SnapshotCandidate,
  detectedAt: Date,
): ChangeEventCandidate {
  const eventTypes: ChangeEventType[] = [];

  if (previous.executableHash !== next.executableHash) {
    eventTypes.push("EXECUTABLE_CHANGED");
  }
  if (previous.upgradeAuthority !== next.upgradeAuthority) {
    eventTypes.push("AUTHORITY_CHANGED");
  }
  if (previous.upgradeAuthority !== null && next.upgradeAuthority === null) {
    eventTypes.push("BECAME_IMMUTABLE");
  }

  return {
    detectedAt,
    eventTypes,
    facts: {
      newAccountDataHash: next.accountDataHash,
      newAuthority: next.upgradeAuthority,
      newDeploymentSlot: next.deploymentSlot.toString(),
      newExecutableHash: next.executableHash,
      newExecutableSize: next.executableSize,
      oldAccountDataHash: previous.accountDataHash,
      oldAuthority: previous.upgradeAuthority,
      oldDeploymentSlot: previous.deploymentSlot.toString(),
      oldExecutableHash: previous.executableHash,
      oldExecutableSize: previous.executableSize,
    },
    fromSnapshotId: previous.id,
    programId: previous.programId,
    ruleEngineVersion: "1",
    severity: eventTypes.some(
      (type) => type === "EXECUTABLE_CHANGED" || type === "AUTHORITY_CHANGED",
    )
      ? "high"
      : "info",
    toFingerprint: next.fingerprint,
  };
}
