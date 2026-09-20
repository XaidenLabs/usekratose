import type { VersionSnapshot } from "./domain.js";

export type ProgramSecurityStatus =
  | "unverified"
  | "current"
  | "stale"
  | "review_required"
  | "immutable"
  | "unknown";

export function deriveProgramSecurityStatus(input: {
  readonly hasPriorSnapshot: boolean;
  readonly snapshot: VersionSnapshot | null;
}): ProgramSecurityStatus {
  const snapshot = input.snapshot;
  if (snapshot === null) return "unknown";
  if (snapshot.upgradeAuthority === null) return "immutable";
  if (snapshot.verificationStatus === "stale") return "stale";
  if (
    (snapshot.verificationStatus === "trusted" ||
      snapshot.verificationStatus === "verified") &&
    snapshot.trustedFingerprint === snapshot.fingerprint
  ) {
    return "current";
  }
  return input.hasPriorSnapshot ? "review_required" : "unverified";
}
