import { createHash } from "node:crypto";

import type { ResolvedDeployment, SnapshotCandidate } from "./domain.js";

function sha256(bytes: Uint8Array | string): string {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

export function createSnapshotCandidate(input: {
  readonly deployment: ResolvedDeployment;
  readonly observedAt: Date;
  readonly observedSlot: bigint;
}): SnapshotCandidate {
  const executableHash = sha256(input.deployment.executableBytes);
  const accountDataHash = sha256(input.deployment.accountData);
  const fingerprintPayload = JSON.stringify({
    accountDataHash,
    deploymentSlot: input.deployment.deploymentSlot.toString(),
    executableHash,
    executableSize: input.deployment.executableBytes.length,
    programAddress: input.deployment.programAddress,
    programDataAddress: input.deployment.programDataAddress,
    upgradeAuthority: input.deployment.upgradeAuthority,
  });

  return {
    accountDataHash,
    deploymentSlot: input.deployment.deploymentSlot,
    executableHash,
    executableSize: input.deployment.executableBytes.length,
    fingerprint: sha256(fingerprintPayload),
    observedAt: input.observedAt,
    observedSlot: input.observedSlot,
    programAddress: input.deployment.programAddress,
    programDataAddress: input.deployment.programDataAddress,
    upgradeAuthority: input.deployment.upgradeAuthority,
  };
}
