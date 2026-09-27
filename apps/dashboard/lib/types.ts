export interface ProgramSecurityAnalysis {
  readonly caveat: string;
  readonly corrections: readonly {
    readonly correction: string;
    readonly fixes: readonly {
      readonly action: string;
      readonly rationale: string;
    }[];
    readonly id: string;
    readonly patches: readonly {
      readonly after: string;
      readonly before: string;
      readonly path: string;
      readonly rationale: string;
    }[];
    readonly reason: string;
    readonly relatedEventIds: readonly string[];
    readonly relatedSnapshotIds: readonly string[];
    readonly severity: "info" | "low" | "medium" | "high" | "critical";
    readonly title: string;
  }[];
  readonly reviewPriorities: readonly string[];
  readonly summary: string;
}

export interface DashboardProfile {
  readonly avatarUrl: string | null;
  readonly createdAt: string;
  readonly displayName: string;
  readonly email: string;
  readonly emailVerified: boolean;
  readonly id: string;
  readonly lastSignInAt: string | null;
  readonly mfaEnabled: boolean;
  readonly providers: readonly string[];
  readonly role: string;
}

export interface DashboardProgramAnalysis {
  readonly analysisId: string;
  readonly analysis: ProgramSecurityAnalysis;
  readonly cached: boolean;
  readonly createdAt: string;
  readonly currentSnapshotId: string;
  readonly model: string;
  readonly provider: string;
  readonly fixes: readonly DashboardFixReview[];
}

export interface DashboardFixReview {
  readonly analysisId: string;
  readonly branchName: string | null;
  readonly createdAt: string;
  readonly decidedAt: string | null;
  readonly findingId: string;
  readonly id: string;
  readonly patches: ProgramSecurityAnalysis["corrections"][number]["patches"];
  readonly pullRequestUrl: string | null;
  readonly status: "applied" | "proposed" | "rejected";
  readonly updatedAt: string;
}

export interface DashboardSourceWorkspace {
  readonly baseBranch: string | null;
  readonly binaryHash: string | null;
  readonly binaryMatchesDeployment: boolean | null;
  readonly binarySize: number | null;
  readonly files: readonly {
    readonly language: string;
    readonly path: string;
    readonly size: number;
    readonly sourceHash: string;
  }[];
  readonly githubInstallationId: string | null;
  readonly id: string;
  readonly idl: unknown | null;
  readonly idlHash: string | null;
  readonly provider: "github" | "upload";
  readonly repositoryUrl: string | null;
  readonly revision: string | null;
  readonly sourceFiles: readonly {
    readonly content: string;
    readonly hash: string;
    readonly path: string;
  }[];
  readonly status: "connected" | "error" | "needs_installation";
}

export interface DashboardProgram {
  readonly currentSnapshot: Readonly<Record<string, unknown>> | null;
  readonly displayName: string;
  readonly eventCount: number;
  readonly events: readonly DashboardSecurityEvent[];
  readonly latestEvent: DashboardSecurityEvent | null;
  readonly program: {
    readonly address: string;
    readonly cluster: "devnet" | "mainnet-beta";
    readonly id: string;
    readonly monitoringStatus: string;
    readonly programDataAddress: string;
  };
  readonly securityStatus: string;
  readonly snapshots: readonly Readonly<Record<string, unknown>>[];
  readonly versionCount: number;
}

export interface DashboardSecurityEvent {
  readonly detectedAt: string;
  readonly evidence: Readonly<Record<string, unknown>>;
  readonly id: string;
  readonly severity: "info" | "low" | "medium" | "high" | "critical";
  readonly type: string;
}

export interface DashboardData {
  readonly alertDestinations: readonly {
    readonly destination: string;
    readonly enabled: boolean;
    readonly id: string;
    readonly minSeverity: string;
    readonly type: string;
  }[];
  readonly apiKeys: readonly {
    readonly id: string;
    readonly keyPrefix: string;
    readonly name: string;
    readonly revokedAt: string | null;
  }[];
  readonly metrics: Readonly<Record<string, number>>;
  readonly onboardingRequired: false;
  readonly profile: DashboardProfile;
  readonly programs: readonly DashboardProgram[];
  readonly recentEvents: readonly {
    readonly event: DashboardSecurityEvent;
    readonly program: DashboardProgram["program"];
  }[];
  readonly workspace: { readonly id: string; readonly name: string };
}

export type DashboardApiData =
  | DashboardData
  | {
      readonly onboardingRequired: true;
      readonly profile: DashboardProfile;
    };
