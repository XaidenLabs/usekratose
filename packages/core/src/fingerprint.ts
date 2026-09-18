import { createHash } from "node:crypto";

import type {
  ResolvedDeployment,
  SnapshotCandidate,
  VerificationStatus,
  VersionSnapshot,
} from "./domain.js";

type CanonicalJson =
  | null
  | boolean
  | number
  | string
  | readonly CanonicalJson[]
  | { readonly [key: string]: CanonicalJson };

function sha256(bytes: Uint8Array | string): string {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function canonicalize(value: unknown): CanonicalJson {
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "string"
  ) {
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (Array.isArray(value)) return value.map(canonicalize);
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonicalize(item)]),
    );
  }
  throw new TypeError(`Cannot canonicalize JSON value of type ${typeof value}`);
}

export function hashCanonicalJson(value: unknown): string {
  return sha256(JSON.stringify(canonicalize(value)));
}

export function createIdlEvidence(idl: unknown): {
  readonly hash: string;
  readonly instructions: readonly string[];
} {
  const canonical = canonicalize(idl);
  const instructions =
    typeof idl === "object" && idl !== null && "instructions" in idl
      ? (idl as { readonly instructions?: unknown }).instructions
      : undefined;
  const names = Array.isArray(instructions)
    ? instructions
        .map((instruction) =>
          typeof instruction === "object" &&
          instruction !== null &&
          "name" in instruction &&
          typeof instruction.name === "string"
            ? instruction.name
            : null,
        )
        .filter((name): name is string => name !== null)
    : [];

  return {
    hash: sha256(JSON.stringify(canonical)),
    instructions: [...new Set(names)].sort(),
  };
}

export interface SnapshotEnrichment {
  readonly idl?: unknown;
  readonly metadata?: unknown;
  readonly sourceReference?: string;
  readonly trustedFingerprint?: string | null;
  readonly verificationStatus?: VerificationStatus;
}

interface SnapshotState {
  readonly accountDataHash: string;
  readonly deploymentSlot: bigint;
  readonly executableHash: string;
  readonly executableSize: number;
  readonly idlHash: string | null;
  readonly idlInstructions: readonly string[] | null;
  readonly metadataHash: string | null;
  readonly observedAt: Date;
  readonly observedSlot: bigint;
  readonly programAddress: string;
  readonly programDataAddress: string;
  readonly programOwner: string;
  readonly sourceReferenceHash: string | null;
  readonly trustedFingerprint: string | null;
  readonly upgradeAuthority: string | null;
  readonly verificationStatus: VerificationStatus;
}

function deploymentFingerprint(
  state: Omit<
    SnapshotState,
    "observedAt" | "observedSlot" | "trustedFingerprint" | "verificationStatus"
  >,
): string {
  return hashCanonicalJson({
    accountDataHash: state.accountDataHash,
    deploymentSlot: state.deploymentSlot.toString(),
    executableHash: state.executableHash,
    executableSize: state.executableSize,
    idlHash: state.idlHash,
    metadataHash: state.metadataHash,
    programAddress: state.programAddress,
    programDataAddress: state.programDataAddress,
    programOwner: state.programOwner,
    sourceReferenceHash: state.sourceReferenceHash,
    upgradeAuthority: state.upgradeAuthority,
  });
}

function finalizeSnapshotState(state: SnapshotState): SnapshotCandidate {
  const fingerprint = deploymentFingerprint(state);
  const trustedFingerprint =
    (state.verificationStatus === "trusted" ||
      state.verificationStatus === "verified") &&
    state.trustedFingerprint === null
      ? fingerprint
      : state.trustedFingerprint;
  const previousTrustNoLongerMatches =
    (state.verificationStatus === "trusted" ||
      state.verificationStatus === "verified") &&
    trustedFingerprint !== null &&
    trustedFingerprint !== fingerprint;

  return {
    ...state,
    fingerprint,
    trustedFingerprint,
    verificationStatus: previousTrustNoLongerMatches
      ? "stale"
      : state.verificationStatus,
  };
}

export function createSnapshotCandidate(input: {
  readonly deployment: ResolvedDeployment;
  readonly enrichment?: SnapshotEnrichment;
  readonly observedAt: Date;
  readonly observedSlot: bigint;
  readonly previous?: VersionSnapshot | null;
}): SnapshotCandidate {
  const idlEvidence =
    input.enrichment?.idl === undefined
      ? null
      : createIdlEvidence(input.enrichment.idl);
  const previous = input.previous ?? null;
  const explicitlyTrustsCurrent =
    input.enrichment?.verificationStatus === "trusted" ||
    input.enrichment?.verificationStatus === "verified";
  const state: SnapshotState = {
    accountDataHash: sha256(input.deployment.accountData),
    deploymentSlot: input.deployment.deploymentSlot,
    executableHash: sha256(input.deployment.executableBytes),
    executableSize: input.deployment.executableBytes.length,
    idlHash: idlEvidence?.hash ?? previous?.idlHash ?? null,
    idlInstructions:
      idlEvidence?.instructions ?? previous?.idlInstructions ?? null,
    metadataHash:
      input.enrichment?.metadata === undefined
        ? (previous?.metadataHash ?? null)
        : hashCanonicalJson(input.enrichment.metadata),
    observedAt: input.observedAt,
    observedSlot: input.observedSlot,
    programAddress: input.deployment.programAddress,
    programDataAddress: input.deployment.programDataAddress,
    programOwner: input.deployment.programOwner,
    sourceReferenceHash:
      input.enrichment?.sourceReference === undefined
        ? (previous?.sourceReferenceHash ?? null)
        : sha256(input.enrichment.sourceReference.trim()),
    trustedFingerprint:
      input.enrichment?.trustedFingerprint !== undefined
        ? input.enrichment.trustedFingerprint
        : explicitlyTrustsCurrent
          ? null
          : (previous?.trustedFingerprint ?? null),
    upgradeAuthority: input.deployment.upgradeAuthority,
    verificationStatus:
      input.enrichment?.verificationStatus ??
      previous?.verificationStatus ??
      "unknown",
  };

  return finalizeSnapshotState(state);
}

export function createOwnerChangeSnapshot(input: {
  readonly observedAt: Date;
  readonly observedSlot: bigint;
  readonly previous: VersionSnapshot;
  readonly programOwner: string;
}): SnapshotCandidate {
  return finalizeSnapshotState({
    accountDataHash: input.previous.accountDataHash,
    deploymentSlot: input.previous.deploymentSlot,
    executableHash: input.previous.executableHash,
    executableSize: input.previous.executableSize,
    idlHash: input.previous.idlHash,
    idlInstructions: input.previous.idlInstructions,
    metadataHash: input.previous.metadataHash,
    observedAt: input.observedAt,
    observedSlot: input.observedSlot,
    programAddress: input.previous.programAddress,
    programDataAddress: input.previous.programDataAddress,
    programOwner: input.programOwner,
    sourceReferenceHash: input.previous.sourceReferenceHash,
    trustedFingerprint: input.previous.trustedFingerprint,
    upgradeAuthority: input.previous.upgradeAuthority,
    verificationStatus: input.previous.verificationStatus,
  });
}
