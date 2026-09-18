export const SUPPORTED_CLUSTERS = ["devnet", "mainnet-beta"] as const;

export type Cluster = (typeof SUPPORTED_CLUSTERS)[number];
export type ProgramId = string;
export type SnapshotId = string;

export type MonitoringStatus =
  | "baselining"
  | "healthy"
  | "degraded"
  | "unsupported";

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
  readonly upgradeAuthority: string | null;
}

export interface SnapshotCandidate {
  readonly accountDataHash: string;
  readonly deploymentSlot: bigint;
  readonly executableHash: string;
  readonly executableSize: number;
  readonly fingerprint: string;
  readonly observedAt: Date;
  readonly observedSlot: bigint;
  readonly programAddress: string;
  readonly programDataAddress: string;
  readonly upgradeAuthority: string | null;
}

export interface VersionSnapshot extends SnapshotCandidate {
  readonly id: SnapshotId;
  readonly programId: ProgramId;
}

export const CHANGE_EVENT_TYPES = [
  "EXECUTABLE_CHANGED",
  "AUTHORITY_CHANGED",
  "BECAME_IMMUTABLE",
] as const;

export type ChangeEventType = (typeof CHANGE_EVENT_TYPES)[number];
export type Severity = "info" | "high";

export interface ChangeFacts {
  readonly newAccountDataHash: string;
  readonly newAuthority: string | null;
  readonly newDeploymentSlot: string;
  readonly newExecutableHash: string;
  readonly newExecutableSize: number;
  readonly oldAccountDataHash: string;
  readonly oldAuthority: string | null;
  readonly oldDeploymentSlot: string;
  readonly oldExecutableHash: string;
  readonly oldExecutableSize: number;
}

export interface ChangeEventCandidate {
  readonly detectedAt: Date;
  readonly eventTypes: readonly ChangeEventType[];
  readonly facts: ChangeFacts;
  readonly fromSnapshotId: SnapshotId;
  readonly programId: ProgramId;
  readonly ruleEngineVersion: "1";
  readonly severity: Severity;
  readonly toFingerprint: string;
}

export interface ChangeEvent extends ChangeEventCandidate {
  readonly id: string;
  readonly toSnapshotId: SnapshotId;
}

export interface MonitoredProgram {
  readonly address: string;
  readonly cluster: Cluster;
  readonly id: ProgramId;
  readonly monitoringStatus: MonitoringStatus;
  readonly programDataAddress: string;
}

export type ReconciliationReason =
  | "baseline"
  | "poll"
  | "startup"
  | "websocket"
  | "websocket-reconnect";

export type ReconciliationResult =
  | { readonly kind: "no-change"; readonly fingerprint: string }
  | {
      readonly event: ChangeEvent;
      readonly kind: "change";
      readonly snapshot: VersionSnapshot;
    };
