export const SUPPORTED_CLUSTERS = ["devnet", "mainnet-beta"] as const;

export type Cluster = (typeof SUPPORTED_CLUSTERS)[number];
export type ProgramId = string;
export type SnapshotId = string;

export type MonitoringStatus =
  "baselining" | "healthy" | "degraded" | "unsupported";

export interface RpcAccount {
  readonly data: Uint8Array;
  readonly executable: boolean;
  readonly lamports: bigint;
  readonly owner: string;
}

export interface AccountRead {
  readonly account: RpcAccount | null;
  readonly contextSlot: bigint;
}

export interface ResolvedDeployment {
  readonly accountData: Uint8Array;
  readonly deploymentSlot: bigint;
  readonly executableBytes: Uint8Array;
  readonly programAddress: string;
  readonly programDataAddress: string;
  readonly programOwner: string;
  readonly upgradeAuthority: string | null;
}

export type VerificationStatus = "unknown" | "trusted" | "verified" | "stale";

export interface SnapshotCandidate {
  readonly accountDataHash: string;
  readonly deploymentSlot: bigint;
  readonly executableHash: string;
  readonly executableSize: number;
  readonly fingerprint: string;
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

export interface VersionSnapshot extends SnapshotCandidate {
  readonly id: SnapshotId;
  readonly programId: ProgramId;
}

export type SecurityEventType =
  | "PROGRAM_UPGRADED"
  | "AUTHORITY_CHANGED"
  | "OWNER_CHANGED"
  | "IDL_CHANGED"
  | "INSTRUCTION_ADDED"
  | "INSTRUCTION_REMOVED"
  | "VERIFICATION_STALE";

export type Severity = "info" | "low" | "medium" | "high" | "critical";

export type SecurityEvidence = Readonly<Record<string, unknown>>;

export interface SecurityEvent {
  readonly currentSnapshotId: string;
  readonly detectedAt: Date;
  readonly evidence: SecurityEvidence;
  readonly id: string;
  readonly previousSnapshotId: string;
  readonly programId: string;
  readonly severity: Severity;
  readonly type: SecurityEventType;
}

export interface SecurityEventCandidate {
  readonly currentFingerprint: string;
  readonly detectedAt: Date;
  readonly evidence: SecurityEvidence;
  readonly previousSnapshotId: string;
  readonly programId: string;
  readonly ruleEngineVersion: "2";
  readonly severity: Severity;
  readonly type: SecurityEventType;
}

export interface SnapshotDiff {
  readonly accountDataChanged: boolean;
  readonly becameImmutable: boolean;
  readonly deploymentSlotChanged: boolean;
  readonly executableChanged: boolean;
  readonly idlChanged: boolean;
  readonly instructionsAdded: readonly string[];
  readonly instructionsRemoved: readonly string[];
  readonly metadataChanged: boolean;
  readonly ownerChanged: boolean;
  readonly programDataChanged: boolean;
  readonly sourceReferenceChanged: boolean;
  readonly upgradeAuthorityChanged: boolean;
  readonly verificationBecameStale: boolean;
}

export interface MonitoredProgram {
  readonly address: string;
  readonly cluster: Cluster;
  readonly id: ProgramId;
  readonly monitoringStatus: MonitoringStatus;
  readonly programDataAddress: string;
}

export type ReconciliationReason =
  "baseline" | "poll" | "startup" | "websocket" | "websocket-reconnect";

export type ReconciliationResult =
  | { readonly kind: "no-change"; readonly fingerprint: string }
  | {
      readonly events: readonly SecurityEvent[];
      readonly kind: "change";
      readonly snapshot: VersionSnapshot;
    };
