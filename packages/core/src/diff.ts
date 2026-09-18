import type {
  SecurityEventCandidate,
  SecurityEventType,
  Severity,
  SnapshotCandidate,
  SnapshotDiff,
  VersionSnapshot,
} from "./domain.js";

function sortedDifference(
  left: readonly string[] | null,
  right: readonly string[] | null,
): readonly string[] {
  if (left === null || right === null) return [];
  const rightSet = new Set(right);
  return left.filter((item) => !rightSet.has(item)).sort();
}

export function diffSnapshots(
  previous: VersionSnapshot,
  current: SnapshotCandidate,
): SnapshotDiff {
  const currentIsTrusted =
    (current.verificationStatus === "trusted" ||
      current.verificationStatus === "verified") &&
    current.trustedFingerprint === current.fingerprint;
  const previousWasTrusted =
    (previous.verificationStatus === "trusted" ||
      previous.verificationStatus === "verified") &&
    previous.trustedFingerprint === previous.fingerprint;

  return {
    accountDataChanged: previous.accountDataHash !== current.accountDataHash,
    becameImmutable:
      previous.upgradeAuthority !== null && current.upgradeAuthority === null,
    deploymentSlotChanged: previous.deploymentSlot !== current.deploymentSlot,
    executableChanged: previous.executableHash !== current.executableHash,
    idlChanged: previous.idlHash !== current.idlHash,
    instructionsAdded: sortedDifference(
      current.idlInstructions,
      previous.idlInstructions,
    ),
    instructionsRemoved: sortedDifference(
      previous.idlInstructions,
      current.idlInstructions,
    ),
    metadataChanged: previous.metadataHash !== current.metadataHash,
    ownerChanged: previous.programOwner !== current.programOwner,
    programDataChanged:
      previous.programDataAddress !== current.programDataAddress,
    sourceReferenceChanged:
      previous.sourceReferenceHash !== current.sourceReferenceHash,
    upgradeAuthorityChanged:
      previous.upgradeAuthority !== current.upgradeAuthority,
    verificationBecameStale:
      previousWasTrusted &&
      previous.fingerprint !== current.fingerprint &&
      !currentIsTrusted,
  };
}

function candidate(
  previous: VersionSnapshot,
  current: SnapshotCandidate,
  detectedAt: Date,
  type: SecurityEventType,
  severity: Severity,
  evidence: Readonly<Record<string, unknown>>,
): SecurityEventCandidate {
  return {
    currentFingerprint: current.fingerprint,
    detectedAt,
    evidence,
    previousSnapshotId: previous.id,
    programId: previous.programId,
    ruleEngineVersion: "2",
    severity,
    type,
  };
}

const PRIVILEGED_INSTRUCTION_PATTERN =
  /admin|authority|upgrade|owner|pause|freeze|mint|withdraw|emergency|privilege/i;

export function createSecurityEventCandidates(
  previous: VersionSnapshot,
  current: SnapshotCandidate,
  detectedAt: Date,
): readonly SecurityEventCandidate[] {
  const diff = diffSnapshots(previous, current);
  const events: SecurityEventCandidate[] = [];

  if (
    diff.executableChanged ||
    diff.programDataChanged ||
    diff.deploymentSlotChanged
  ) {
    events.push(
      candidate(
        previous,
        current,
        detectedAt,
        "PROGRAM_UPGRADED",
        diff.executableChanged || diff.programDataChanged ? "high" : "info",
        {
          currentDeploymentSlot: current.deploymentSlot.toString(),
          currentExecutableHash: current.executableHash,
          currentProgramDataAddress: current.programDataAddress,
          deploymentSlotChanged: diff.deploymentSlotChanged,
          executableChanged: diff.executableChanged,
          previousDeploymentSlot: previous.deploymentSlot.toString(),
          previousExecutableHash: previous.executableHash,
          previousProgramDataAddress: previous.programDataAddress,
          programDataChanged: diff.programDataChanged,
        },
      ),
    );
  }

  if (diff.upgradeAuthorityChanged) {
    events.push(
      candidate(
        previous,
        current,
        detectedAt,
        "AUTHORITY_CHANGED",
        diff.becameImmutable ? "info" : "high",
        {
          becameImmutable: diff.becameImmutable,
          currentAuthority: current.upgradeAuthority,
          previousAuthority: previous.upgradeAuthority,
        },
      ),
    );
  }

  if (diff.ownerChanged) {
    events.push(
      candidate(previous, current, detectedAt, "OWNER_CHANGED", "critical", {
        currentOwner: current.programOwner,
        previousOwner: previous.programOwner,
      }),
    );
  }

  if (diff.idlChanged) {
    events.push(
      candidate(previous, current, detectedAt, "IDL_CHANGED", "medium", {
        currentIdlHash: current.idlHash,
        previousIdlHash: previous.idlHash,
      }),
    );
  }

  if (diff.instructionsAdded.length > 0) {
    const privilegedLooking = diff.instructionsAdded.filter((instruction) =>
      PRIVILEGED_INSTRUCTION_PATTERN.test(instruction),
    );
    events.push(
      candidate(
        previous,
        current,
        detectedAt,
        "INSTRUCTION_ADDED",
        privilegedLooking.length > 0 ? "high" : "medium",
        {
          instructions: diff.instructionsAdded,
          privilegedLooking,
        },
      ),
    );
  }

  if (diff.instructionsRemoved.length > 0) {
    events.push(
      candidate(
        previous,
        current,
        detectedAt,
        "INSTRUCTION_REMOVED",
        "medium",
        { instructions: diff.instructionsRemoved },
      ),
    );
  }

  if (diff.verificationBecameStale) {
    events.push(
      candidate(previous, current, detectedAt, "VERIFICATION_STALE", "high", {
        currentFingerprint: current.fingerprint,
        metadataChanged: diff.metadataChanged,
        previousTrustedFingerprint: previous.trustedFingerprint,
        sourceReferenceChanged: diff.sourceReferenceChanged,
      }),
    );
  }

  return events;
}
