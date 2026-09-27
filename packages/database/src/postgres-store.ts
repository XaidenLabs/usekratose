import type {
  ApiAccessStore,
  ApiKeyRecord,
  CreateProgramInput,
  PersistedTransition,
  ProgramStore,
} from "@usekratose/application";
import type {
  Cluster,
  MonitoredProgram,
  MonitoringStatus,
  NormalizedIdl,
  SecurityEvent,
  SecurityEventCandidate,
  SnapshotCandidate,
  SourceVerificationStatus,
  VerificationStatus,
  VersionSnapshot,
} from "@usekratose/core";
import type {
  AlertDestination,
  AlertDestinationType,
  AlertStore,
  PendingAlertDelivery,
} from "@usekratose/alerts";
import type {
  ExplanationStore,
  ProgramAnalysisEvidence,
  ProgramSecurityAnalysis,
  SecurityExplanation,
  UnexplainedSecurityEvent,
} from "@usekratose/explanations";
import postgres, {
  type JSONValue,
  type Sql,
  type TransactionSql,
} from "postgres";

type QuerySql = Sql | TransactionSql;

interface ProgramRow {
  address: string;
  cluster: Cluster;
  id: string;
  monitoring_status: MonitoringStatus;
  programdata_address: string;
}

interface ProjectProgramRow extends ProgramRow {
  display_name: string;
}

export interface ProjectProgramMonitor {
  readonly displayName: string;
  readonly program: MonitoredProgram;
}

interface ApiKeyRow {
  id: string;
  key_prefix: string;
  name: string;
  project_id: string;
  revoked_at: Date | null;
}

interface ProjectRow {
  id: string;
  name: string;
  owner_user_id: string | null;
}

interface SnapshotRow {
  account_data_hash: string;
  deployment_slot: string;
  executable_hash: string;
  executable_size: number;
  fingerprint: string;
  id: string;
  idl: NormalizedIdl | string | null;
  idl_hash: string | null;
  idl_instructions: readonly string[] | string | null;
  metadata_hash: string | null;
  observed_at: Date;
  observed_slot: string;
  program_address: string;
  program_executable: boolean;
  program_id: string;
  program_owner: string;
  programdata_address: string;
  source_reference_hash: string | null;
  source_repository_url: string | null;
  source_revision: string | null;
  source_verification_status: SourceVerificationStatus;
  trusted_fingerprint: string | null;
  upgrade_authority: string | null;
  verification_status: VerificationStatus;
}

interface SecurityEventRow {
  current_snapshot_id: string;
  detected_at: Date;
  evidence: Readonly<Record<string, unknown>> | string;
  id: string;
  previous_snapshot_id: string;
  program_id: string;
  severity: SecurityEvent["severity"];
  type: SecurityEvent["type"];
}

interface AlertDestinationRow {
  destination: string;
  enabled: boolean;
  id: string;
  min_severity: SecurityEvent["severity"];
  project_id: string;
  secret_ciphertext: string;
  type: AlertDestinationType;
}

interface PendingAlertDeliveryRow extends SecurityEventRow {
  attempts: number;
  delivery_id: string;
  destination: string;
  destination_enabled: boolean;
  destination_id: string;
  destination_type: AlertDestinationType;
  min_severity: SecurityEvent["severity"];
  program_address: string;
  project_id: string;
  secret_ciphertext: string;
}

export interface StoredExplanation {
  readonly createdAt: Date;
  readonly eventId: string;
  readonly explanation: SecurityExplanation;
  readonly model: string;
  readonly promptVersion: string;
  readonly provider: string;
}

export interface ProgramClaim {
  readonly createdAt: Date;
  readonly id: string;
  readonly programId: string;
  readonly projectId: string;
  readonly status: "pending" | "verified" | "rejected";
}

export interface RecentPublicSecurityActivity {
  readonly currentSnapshot: VersionSnapshot;
  readonly event: SecurityEvent;
  readonly previousSnapshot: VersionSnapshot;
  readonly program: MonitoredProgram;
}

interface RecentPublicSecurityEventRow extends SecurityEventRow {
  program_address: string;
  program_cluster: Cluster;
  program_monitoring_status: MonitoringStatus;
  program_programdata_address: string;
}

interface ProgramClaimRow {
  created_at: Date;
  id: string;
  program_id: string;
  project_id: string;
  status: ProgramClaim["status"];
}

interface ExplanationRow {
  created_at: Date;
  explanation: SecurityExplanation | string;
  model: string;
  prompt_version: string;
  provider: string;
  security_event_id: string;
}

interface ProgramAnalysisRow {
  analysis: ProgramSecurityAnalysis | string;
  created_at: Date;
  current_snapshot_id: string;
  evidence_hash: string;
  evidence_input: ProgramAnalysisEvidence | string;
  id: string;
  model: string;
  program_id: string;
  prompt_version: string;
  provider: string;
}

interface ProgramSourceWorkspaceRow {
  base_branch: string | null;
  binary_hash: string | null;
  binary_matches_deployment: boolean | null;
  binary_size: number | null;
  created_at: Date;
  github_installation_id: string | null;
  id: string;
  idl: unknown | string | null;
  idl_hash: string | null;
  program_id: string;
  project_id: string;
  provider: ProgramSourceWorkspace["provider"];
  repository_name: string | null;
  repository_owner: string | null;
  repository_url: string | null;
  revision: string | null;
  status: ProgramSourceWorkspace["status"];
  updated_at: Date;
}

interface ProgramSourceFileRow {
  created_at: Date;
  id: string;
  language: string;
  object_path: string | null;
  path: string;
  size: number;
  source_hash: string;
  updated_at: Date;
  workspace_id: string;
}

interface ProgramFixReviewRow {
  analysis_id: string;
  branch_name: string | null;
  created_at: Date;
  decided_at: Date | null;
  finding_id: string;
  id: string;
  patches: ProgramFixReview["patches"] | string;
  pull_request_url: string | null;
  status: ProgramFixReview["status"];
  updated_at: Date;
}

export interface ProgramSourceFile {
  readonly createdAt: Date;
  readonly id: string;
  readonly language: string;
  readonly objectPath: string | null;
  readonly path: string;
  readonly size: number;
  readonly sourceHash: string;
  readonly updatedAt: Date;
  readonly workspaceId: string;
}

export interface ProgramSourceWorkspace {
  readonly baseBranch: string | null;
  readonly binaryHash: string | null;
  readonly binaryMatchesDeployment: boolean | null;
  readonly binarySize: number | null;
  readonly createdAt: Date;
  readonly files: readonly ProgramSourceFile[];
  readonly githubInstallationId: string | null;
  readonly id: string;
  readonly idl: unknown | null;
  readonly idlHash: string | null;
  readonly programId: string;
  readonly projectId: string;
  readonly provider: "github" | "upload";
  readonly repositoryName: string | null;
  readonly repositoryOwner: string | null;
  readonly repositoryUrl: string | null;
  readonly revision: string | null;
  readonly status: "connected" | "error" | "needs_installation";
  readonly updatedAt: Date;
}

export interface ProgramFixReview {
  readonly analysisId: string;
  readonly branchName: string | null;
  readonly createdAt: Date;
  readonly decidedAt: Date | null;
  readonly findingId: string;
  readonly id: string;
  readonly patches: ProgramSecurityAnalysis["corrections"][number]["patches"];
  readonly pullRequestUrl: string | null;
  readonly status: "applied" | "proposed" | "rejected";
  readonly updatedAt: Date;
}

export interface StoredProgramAnalysis {
  readonly analysis: ProgramSecurityAnalysis;
  readonly createdAt: Date;
  readonly currentSnapshotId: string;
  readonly evidenceHash: string;
  readonly evidenceInput: ProgramAnalysisEvidence;
  readonly id: string;
  readonly model: string;
  readonly programId: string;
  readonly promptVersion: string;
  readonly provider: string;
}

function mapProgram(row: ProgramRow): MonitoredProgram {
  return {
    address: row.address,
    cluster: row.cluster,
    id: row.id,
    monitoringStatus: row.monitoring_status,
    programDataAddress: row.programdata_address,
  };
}

function mapApiKey(row: ApiKeyRow): ApiKeyRecord {
  return {
    id: row.id,
    keyPrefix: row.key_prefix,
    name: row.name,
    projectId: row.project_id,
    revokedAt: row.revoked_at,
  };
}

function parseJsonColumn<T>(value: T | string): T {
  return typeof value === "string" ? (JSON.parse(value) as T) : value;
}

function mapProgramAnalysis(row: ProgramAnalysisRow): StoredProgramAnalysis {
  return {
    analysis: parseJsonColumn<ProgramSecurityAnalysis>(row.analysis),
    createdAt: row.created_at,
    currentSnapshotId: row.current_snapshot_id,
    evidenceHash: row.evidence_hash,
    evidenceInput: parseJsonColumn<ProgramAnalysisEvidence>(row.evidence_input),
    id: row.id,
    model: row.model,
    programId: row.program_id,
    promptVersion: row.prompt_version,
    provider: row.provider,
  };
}

function mapSourceFile(row: ProgramSourceFileRow): ProgramSourceFile {
  return {
    createdAt: row.created_at,
    id: row.id,
    language: row.language,
    objectPath: row.object_path,
    path: row.path,
    size: row.size,
    sourceHash: row.source_hash,
    updatedAt: row.updated_at,
    workspaceId: row.workspace_id,
  };
}

function mapFixReview(row: ProgramFixReviewRow): ProgramFixReview {
  return {
    analysisId: row.analysis_id,
    branchName: row.branch_name,
    createdAt: row.created_at,
    decidedAt: row.decided_at,
    findingId: row.finding_id,
    id: row.id,
    patches: parseJsonColumn<ProgramFixReview["patches"]>(row.patches),
    pullRequestUrl: row.pull_request_url,
    status: row.status,
    updatedAt: row.updated_at,
  };
}

function mapSourceWorkspace(
  row: ProgramSourceWorkspaceRow,
  files: readonly ProgramSourceFile[],
): ProgramSourceWorkspace {
  return {
    baseBranch: row.base_branch,
    binaryHash: row.binary_hash,
    binaryMatchesDeployment: row.binary_matches_deployment,
    binarySize: row.binary_size,
    createdAt: row.created_at,
    files,
    githubInstallationId: row.github_installation_id,
    id: row.id,
    idl: row.idl === null ? null : parseJsonColumn<unknown>(row.idl),
    idlHash: row.idl_hash,
    programId: row.program_id,
    projectId: row.project_id,
    provider: row.provider,
    repositoryName: row.repository_name,
    repositoryOwner: row.repository_owner,
    repositoryUrl: row.repository_url,
    revision: row.revision,
    status: row.status,
    updatedAt: row.updated_at,
  };
}

function jsonValue(value: unknown): JSONValue {
  return value as JSONValue;
}

function mapSnapshot(row: SnapshotRow): VersionSnapshot {
  return {
    accountDataHash: row.account_data_hash,
    deploymentSlot: BigInt(row.deployment_slot),
    executableHash: row.executable_hash,
    executableSize: row.executable_size,
    fingerprint: row.fingerprint,
    id: row.id,
    idl: row.idl === null ? null : parseJsonColumn<NormalizedIdl>(row.idl),
    idlHash: row.idl_hash,
    idlInstructions:
      row.idl_instructions === null
        ? null
        : parseJsonColumn<readonly string[]>(row.idl_instructions),
    metadataHash: row.metadata_hash,
    observedAt: row.observed_at,
    observedSlot: BigInt(row.observed_slot),
    programAddress: row.program_address,
    programDataAddress: row.programdata_address,
    programExecutable: row.program_executable,
    programId: row.program_id,
    programOwner: row.program_owner,
    sourceReferenceHash: row.source_reference_hash,
    sourceRepositoryUrl: row.source_repository_url,
    sourceRevision: row.source_revision,
    sourceVerificationStatus: row.source_verification_status,
    trustedFingerprint: row.trusted_fingerprint,
    upgradeAuthority: row.upgrade_authority,
    verificationStatus: row.verification_status,
  };
}

function mapSecurityEvent(row: SecurityEventRow): SecurityEvent {
  return {
    currentSnapshotId: row.current_snapshot_id,
    detectedAt: row.detected_at,
    evidence: parseJsonColumn<Readonly<Record<string, unknown>>>(row.evidence),
    id: row.id,
    previousSnapshotId: row.previous_snapshot_id,
    programId: row.program_id,
    severity: row.severity,
    type: row.type,
  };
}

function mapAlertDestination(row: AlertDestinationRow): AlertDestination {
  return {
    destination: row.destination,
    enabled: row.enabled,
    id: row.id,
    minSeverity: row.min_severity,
    projectId: row.project_id,
    secretCiphertext: row.secret_ciphertext,
    type: row.type,
  };
}

export class PostgresProgramStore
  implements ProgramStore, AlertStore, ApiAccessStore, ExplanationStore
{
  public constructor(private readonly sql: Sql) {}

  public async addOrganizationMonitor(
    organizationId: string,
    programId: string,
  ): Promise<void> {
    await this.createProject(organizationId, organizationId);
    const inserted = await this.sql<{ readonly program_id: string }[]>`
      INSERT INTO organization_program_monitors (
        organization_id, program_id, display_name
      )
      SELECT ${organizationId}, programs.id, programs.address
      FROM programs
      WHERE programs.id = ${programId}
      ON CONFLICT DO NOTHING
      RETURNING program_id
    `;
    if (inserted.length === 1) {
      await this.recordMetric({
        metricName: "programs_monitored",
        programId,
        projectId: organizationId,
      });
    }
  }

  public async listProgramMonitorsForProject(
    projectId: string,
  ): Promise<readonly ProjectProgramMonitor[]> {
    const rows = await this.sql<ProjectProgramRow[]>`
      SELECT programs.id, programs.cluster, programs.address,
        programs.programdata_address, programs.monitoring_status,
        monitors.display_name
      FROM programs
      JOIN organization_program_monitors monitors
        ON monitors.program_id = programs.id
      WHERE monitors.organization_id = ${projectId}
      ORDER BY programs.updated_at DESC, programs.id DESC
    `;
    return rows.map((row) => ({
      displayName: row.display_name,
      program: mapProgram(row),
    }));
  }

  public async removeOrganizationMonitor(
    organizationId: string,
    programId: string,
  ): Promise<boolean> {
    const deleted = await this.sql<{ readonly program_id: string }[]>`
      DELETE FROM organization_program_monitors
      WHERE organization_id = ${organizationId}
        AND program_id = ${programId}
      RETURNING program_id
    `;
    return deleted.length === 1;
  }

  public async setOrganizationMonitorName(
    organizationId: string,
    programId: string,
    displayName: string,
  ): Promise<boolean> {
    const updated = await this.sql<{ readonly program_id: string }[]>`
      UPDATE organization_program_monitors
      SET display_name = ${displayName}
      WHERE organization_id = ${organizationId}
        AND program_id = ${programId}
      RETURNING program_id
    `;
    return updated.length === 1;
  }

  public async createOrGetProgram(
    input: CreateProgramInput,
  ): Promise<MonitoredProgram> {
    const [row] = await this.sql<ProgramRow[]>`
      INSERT INTO programs (
        cluster, address, programdata_address, monitoring_status
      ) VALUES (
        ${input.cluster}, ${input.address}, ${input.programDataAddress}, ${input.status}
      )
      ON CONFLICT (cluster, address) DO UPDATE SET
        updated_at = now()
      RETURNING id, cluster, address, programdata_address, monitoring_status
    `;
    if (row === undefined) throw new Error("Failed to create or load program");
    return mapProgram(row);
  }

  public async createProject(projectId: string, name: string): Promise<void> {
    await this.sql`
      INSERT INTO projects (id, name) VALUES (${projectId}, ${name})
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, updated_at = now()
    `;
  }

  public async createProjectForUser(input: {
    readonly name: string;
    readonly projectId: string;
    readonly userId: string;
  }): Promise<{ readonly id: string; readonly name: string }> {
    const [row] = await this.sql<ProjectRow[]>`
      INSERT INTO projects (id, name, owner_user_id)
      VALUES (${input.projectId}, ${input.name}, ${input.userId}::uuid)
      ON CONFLICT (owner_user_id) WHERE owner_user_id IS NOT NULL
      DO UPDATE SET name = EXCLUDED.name, updated_at = now()
      RETURNING id, name, owner_user_id
    `;
    if (row === undefined) throw new Error("Failed to create user project");
    return { id: row.id, name: row.name };
  }

  public async getProjectForUser(
    userId: string,
  ): Promise<{ readonly id: string; readonly name: string } | null> {
    const [row] = await this.sql<ProjectRow[]>`
      SELECT id, name, owner_user_id
      FROM projects
      WHERE owner_user_id = ${userId}::uuid
      LIMIT 1
    `;
    return row === undefined ? null : { id: row.id, name: row.name };
  }

  public async createApiKey(input: {
    readonly keyHash: string;
    readonly keyPrefix: string;
    readonly name: string;
    readonly projectId: string;
  }): Promise<ApiKeyRecord> {
    await this.createProject(input.projectId, input.projectId);
    const [row] = await this.sql<ApiKeyRow[]>`
      INSERT INTO api_keys (project_id, name, key_prefix, key_hash)
      VALUES (${input.projectId}, ${input.name}, ${input.keyPrefix}, ${input.keyHash})
      RETURNING id, project_id, name, key_prefix, revoked_at
    `;
    if (row === undefined) throw new Error("Failed to create API key");
    return mapApiKey(row);
  }

  public async findApiKeyByHash(keyHash: string): Promise<ApiKeyRecord | null> {
    const [row] = await this.sql<ApiKeyRow[]>`
      SELECT id, project_id, name, key_prefix, revoked_at
      FROM api_keys WHERE key_hash = ${keyHash}
    `;
    return row === undefined ? null : mapApiKey(row);
  }

  public async listApiKeys(
    projectId: string,
  ): Promise<readonly ApiKeyRecord[]> {
    const rows = await this.sql<ApiKeyRow[]>`
      SELECT id, project_id, name, key_prefix, revoked_at
      FROM api_keys WHERE project_id = ${projectId}
      ORDER BY created_at DESC, id DESC
    `;
    return rows.map(mapApiKey);
  }

  public async revokeApiKey(
    apiKeyId: string,
    projectId: string,
  ): Promise<boolean> {
    const rows = await this.sql<{ readonly id: string }[]>`
      UPDATE api_keys SET revoked_at = now()
      WHERE id = ${apiKeyId} AND project_id = ${projectId}
        AND revoked_at IS NULL
      RETURNING id
    `;
    return rows.length === 1;
  }

  public async touchApiKey(apiKeyId: string, usedAt: Date): Promise<void> {
    await this.sql`
      UPDATE api_keys SET last_used_at = ${usedAt} WHERE id = ${apiKeyId}
    `;
  }

  public async consumeRateLimit(input: {
    readonly apiKeyId: string;
    readonly limit: number;
    readonly windowStartedAt: Date;
  }): Promise<{ readonly allowed: boolean; readonly remaining: number }> {
    const [row] = await this.sql<{ readonly request_count: number }[]>`
      INSERT INTO api_rate_limits (api_key_id, window_started_at, request_count)
      VALUES (${input.apiKeyId}, ${input.windowStartedAt}, 1)
      ON CONFLICT (api_key_id, window_started_at) DO UPDATE SET
        request_count = api_rate_limits.request_count + 1
      WHERE api_rate_limits.request_count < ${input.limit}
      RETURNING request_count
    `;
    if (row === undefined) return { allowed: false, remaining: 0 };
    return {
      allowed: true,
      remaining: Math.max(0, input.limit - row.request_count),
    };
  }

  public async logApiRequest(input: {
    readonly apiKeyId: string | null;
    readonly durationMs: number;
    readonly method: string;
    readonly path: string;
    readonly projectId: string | null;
    readonly requestId: string;
    readonly statusCode: number;
  }): Promise<void> {
    await this.sql`
      INSERT INTO api_request_logs (
        api_key_id, project_id, method, path, status_code, duration_ms, request_id
      ) VALUES (
        ${input.apiKeyId}, ${input.projectId}, ${input.method}, ${input.path},
        ${input.statusCode}, ${input.durationMs}, ${input.requestId}
      )
    `;
    await this.recordMetric({
      metadata: {
        method: input.method,
        path: input.path,
        status: input.statusCode,
      },
      metricName: "api_requests",
      ...(input.projectId === null ? {} : { projectId: input.projectId }),
    });
  }

  public async getProgramByIdentifier(
    identifier: string,
    projectId?: string,
  ): Promise<MonitoredProgram | null> {
    const [row] = await this.sql<ProgramRow[]>`
      SELECT programs.id, programs.cluster, programs.address,
        programs.programdata_address, programs.monitoring_status
      FROM programs
      WHERE (programs.id::text = ${identifier} OR programs.address = ${identifier})
        AND (
          ${projectId ?? null}::text IS NULL OR EXISTS (
            SELECT 1 FROM organization_program_monitors monitors
            WHERE monitors.program_id = programs.id
              AND monitors.organization_id = ${projectId ?? null}
          )
        )
      LIMIT 1
    `;
    return row === undefined ? null : mapProgram(row);
  }

  public async listProgramsForProject(
    projectId: string,
  ): Promise<readonly MonitoredProgram[]> {
    const rows = await this.sql<ProgramRow[]>`
      SELECT programs.id, programs.cluster, programs.address,
        programs.programdata_address, programs.monitoring_status
      FROM programs
      JOIN organization_program_monitors monitors
        ON monitors.program_id = programs.id
      WHERE monitors.organization_id = ${projectId}
      ORDER BY programs.updated_at DESC, programs.id DESC
    `;
    return rows.map(mapProgram);
  }

  public async listPublicPrograms(
    limit = 50,
  ): Promise<readonly MonitoredProgram[]> {
    const rows = await this.sql<ProgramRow[]>`
      SELECT id, cluster, address, programdata_address, monitoring_status
      FROM programs
      ORDER BY updated_at DESC, id DESC
      LIMIT ${limit}
    `;
    return rows.map(mapProgram);
  }

  public async listRecentPublicSecurityActivity(
    limit = 2,
  ): Promise<readonly RecentPublicSecurityActivity[]> {
    const rows = await this.sql<RecentPublicSecurityEventRow[]>`
      SELECT events.*, programs.address AS program_address,
        programs.cluster AS program_cluster,
        programs.monitoring_status AS program_monitoring_status,
        programs.programdata_address AS program_programdata_address
      FROM security_events events
      JOIN programs ON programs.id = events.program_id
      ORDER BY events.detected_at DESC, events.created_at DESC, events.id DESC
      LIMIT ${limit}
    `;
    if (rows.length === 0) return [];

    const snapshotIds = [
      ...new Set(
        rows.flatMap((row) => [
          row.previous_snapshot_id,
          row.current_snapshot_id,
        ]),
      ),
    ];
    const snapshotRows = await this.sql<SnapshotRow[]>`
      SELECT * FROM version_snapshots
      WHERE id = ANY(${snapshotIds}::uuid[])
    `;
    const snapshots = new Map(
      snapshotRows.map((row) => [row.id, mapSnapshot(row)]),
    );

    return rows.flatMap((row) => {
      const previousSnapshot = snapshots.get(row.previous_snapshot_id);
      const currentSnapshot = snapshots.get(row.current_snapshot_id);
      if (previousSnapshot === undefined || currentSnapshot === undefined) {
        return [];
      }
      return [
        {
          currentSnapshot,
          event: mapSecurityEvent(row),
          previousSnapshot,
          program: {
            address: row.program_address,
            cluster: row.program_cluster,
            id: row.program_id,
            monitoringStatus: row.program_monitoring_status,
            programDataAddress: row.program_programdata_address,
          },
        },
      ];
    });
  }

  public async listSnapshots(
    programId: string,
    limit = 100,
  ): Promise<readonly VersionSnapshot[]> {
    const rows = await this.sql<SnapshotRow[]>`
      SELECT * FROM version_snapshots
      WHERE program_id = ${programId}
      ORDER BY observed_slot DESC, created_at DESC, id DESC
      LIMIT ${limit}
    `;
    return rows.map(mapSnapshot);
  }

  public async getSnapshotById(
    snapshotId: string,
  ): Promise<VersionSnapshot | null> {
    const [row] = await this.sql<SnapshotRow[]>`
      SELECT * FROM version_snapshots WHERE id = ${snapshotId}
    `;
    return row === undefined ? null : mapSnapshot(row);
  }

  public async listSecurityEvents(
    programId: string,
    limit = 100,
  ): Promise<readonly SecurityEvent[]> {
    const rows = await this.sql<SecurityEventRow[]>`
      SELECT * FROM security_events
      WHERE program_id = ${programId}
      ORDER BY detected_at DESC, created_at DESC, id DESC
      LIMIT ${limit}
    `;
    return rows.map(mapSecurityEvent);
  }

  public async listEventsMissingExplanation(input: {
    readonly eventId?: string;
    readonly limit: number;
    readonly model: string;
    readonly programId?: string;
    readonly promptVersion: string;
    readonly provider: string;
  }): Promise<readonly UnexplainedSecurityEvent[]> {
    const rows = await this.sql<
      (SecurityEventRow & { readonly program_address: string })[]
    >`
      SELECT events.*, programs.address AS program_address
      FROM security_events events
      JOIN programs ON programs.id = events.program_id
      WHERE (${input.eventId ?? null}::uuid IS NULL OR events.id = ${input.eventId ?? null}::uuid)
        AND (${input.programId ?? null}::uuid IS NULL OR events.program_id = ${input.programId ?? null}::uuid)
        AND NOT EXISTS (
        SELECT 1 FROM ai_explanations explanations
        WHERE explanations.security_event_id = events.id
          AND explanations.provider = ${input.provider}
          AND explanations.model = ${input.model}
          AND explanations.prompt_version = ${input.promptVersion}
      )
      ORDER BY events.detected_at ASC, events.id ASC
      LIMIT ${input.limit}
    `;
    return rows.map((row) => ({
      event: mapSecurityEvent(row),
      programAddress: row.program_address,
    }));
  }

  public async saveExplanation(input: {
    readonly eventId: string;
    readonly evidenceHash: string;
    readonly evidenceInput: Readonly<Record<string, unknown>>;
    readonly explanation: SecurityExplanation;
    readonly model: string;
    readonly promptVersion: string;
    readonly provider: string;
  }): Promise<void> {
    await this.sql`
      INSERT INTO ai_explanations (
        security_event_id, provider, model, prompt_version,
        evidence_hash, evidence_input, explanation
      ) VALUES (
        ${input.eventId}, ${input.provider}, ${input.model},
        ${input.promptVersion}, ${input.evidenceHash},
        ${this.sql.json(jsonValue(input.evidenceInput))},
        ${this.sql.json(jsonValue(input.explanation))}
      )
      ON CONFLICT (
        security_event_id, provider, model, prompt_version, evidence_hash
      ) DO NOTHING
    `;
  }

  public async listExplanationsForProgram(
    programId: string,
  ): Promise<readonly StoredExplanation[]> {
    const rows = await this.sql<ExplanationRow[]>`
      SELECT explanations.*
      FROM ai_explanations explanations
      JOIN security_events events
        ON events.id = explanations.security_event_id
      WHERE events.program_id = ${programId}
      ORDER BY explanations.created_at DESC, explanations.id DESC
    `;
    return rows.map((row) => ({
      createdAt: row.created_at,
      eventId: row.security_event_id,
      explanation: parseJsonColumn<SecurityExplanation>(row.explanation),
      model: row.model,
      promptVersion: row.prompt_version,
      provider: row.provider,
    }));
  }

  public async getProgramAnalysis(input: {
    readonly currentSnapshotId: string;
    readonly evidenceHash: string;
    readonly model: string;
    readonly programId: string;
    readonly promptVersion: string;
    readonly provider: string;
  }): Promise<StoredProgramAnalysis | null> {
    const [row] = await this.sql<ProgramAnalysisRow[]>`
      SELECT *
      FROM program_ai_analyses
      WHERE program_id = ${input.programId}
        AND current_snapshot_id = ${input.currentSnapshotId}
        AND provider = ${input.provider}
        AND model = ${input.model}
        AND prompt_version = ${input.promptVersion}
        AND evidence_hash = ${input.evidenceHash}
      LIMIT 1
    `;
    return row === undefined ? null : mapProgramAnalysis(row);
  }

  public async saveProgramAnalysis(input: {
    readonly analysis: ProgramSecurityAnalysis;
    readonly currentSnapshotId: string;
    readonly evidenceHash: string;
    readonly evidenceInput: ProgramAnalysisEvidence;
    readonly model: string;
    readonly programId: string;
    readonly promptVersion: string;
    readonly provider: string;
  }): Promise<StoredProgramAnalysis> {
    const [row] = await this.sql<ProgramAnalysisRow[]>`
      INSERT INTO program_ai_analyses (
        program_id, current_snapshot_id, provider, model, prompt_version,
        evidence_hash, evidence_input, analysis
      ) VALUES (
        ${input.programId}, ${input.currentSnapshotId}, ${input.provider},
        ${input.model}, ${input.promptVersion}, ${input.evidenceHash},
        ${this.sql.json(jsonValue(input.evidenceInput))},
        ${this.sql.json(jsonValue(input.analysis))}
      )
      ON CONFLICT (
        program_id, current_snapshot_id, provider, model, prompt_version,
        evidence_hash
      ) DO UPDATE SET analysis = EXCLUDED.analysis
      RETURNING *
    `;
    if (row === undefined) throw new Error("Failed to save program analysis");
    return mapProgramAnalysis(row);
  }

  public async getProgramAnalysisById(
    analysisId: string,
  ): Promise<StoredProgramAnalysis | null> {
    const [row] = await this.sql<ProgramAnalysisRow[]>`
      SELECT * FROM program_ai_analyses WHERE id = ${analysisId} LIMIT 1
    `;
    return row === undefined ? null : mapProgramAnalysis(row);
  }

  public async getProgramSourceWorkspace(
    projectId: string,
    programId: string,
  ): Promise<ProgramSourceWorkspace | null> {
    const [row] = await this.sql<ProgramSourceWorkspaceRow[]>`
      SELECT *
      FROM program_source_workspaces
      WHERE project_id = ${projectId} AND program_id = ${programId}
      LIMIT 1
    `;
    if (row === undefined) return null;
    const files = await this.sql<ProgramSourceFileRow[]>`
      SELECT * FROM program_source_files
      WHERE workspace_id = ${row.id}
      ORDER BY path ASC
    `;
    return mapSourceWorkspace(row, files.map(mapSourceFile));
  }

  public async upsertProgramSourceWorkspace(input: {
    readonly baseBranch?: string | null;
    readonly githubInstallationId?: string | null;
    readonly programId: string;
    readonly projectId: string;
    readonly provider: ProgramSourceWorkspace["provider"];
    readonly repositoryName?: string | null;
    readonly repositoryOwner?: string | null;
    readonly repositoryUrl?: string | null;
    readonly revision?: string | null;
    readonly status?: ProgramSourceWorkspace["status"];
  }): Promise<ProgramSourceWorkspace> {
    const [row] = await this.sql<ProgramSourceWorkspaceRow[]>`
      INSERT INTO program_source_workspaces (
        project_id, program_id, provider, repository_url, repository_owner,
        repository_name, base_branch, revision, github_installation_id, status
      ) VALUES (
        ${input.projectId}, ${input.programId}, ${input.provider},
        ${input.repositoryUrl ?? null}, ${input.repositoryOwner ?? null},
        ${input.repositoryName ?? null}, ${input.baseBranch ?? null},
        ${input.revision ?? null}, ${input.githubInstallationId ?? null},
        ${input.status ?? "connected"}
      )
      ON CONFLICT (project_id, program_id) DO UPDATE SET
        provider = EXCLUDED.provider,
        repository_url = EXCLUDED.repository_url,
        repository_owner = EXCLUDED.repository_owner,
        repository_name = EXCLUDED.repository_name,
        base_branch = EXCLUDED.base_branch,
        revision = EXCLUDED.revision,
        github_installation_id = EXCLUDED.github_installation_id,
        status = EXCLUDED.status,
        updated_at = now()
      RETURNING *
    `;
    if (row === undefined) throw new Error("Failed to save source workspace");
    return mapSourceWorkspace(row, []);
  }

  public async replaceProgramSourceFiles(
    workspaceId: string,
    files: readonly {
      readonly language: string;
      readonly objectPath: string | null;
      readonly path: string;
      readonly size: number;
      readonly sourceHash: string;
    }[],
  ): Promise<void> {
    await this.sql.begin(async (transaction) => {
      await transaction`
        DELETE FROM program_source_files WHERE workspace_id = ${workspaceId}
      `;
      for (const file of files) {
        await transaction`
          INSERT INTO program_source_files (
            workspace_id, path, object_path, source_hash, size, language
          ) VALUES (
            ${workspaceId}, ${file.path}, ${file.objectPath},
            ${file.sourceHash}, ${file.size}, ${file.language}
          )
        `;
      }
    });
  }

  public async saveProgramArtifactEvidence(input: {
    readonly binaryHash?: string | null;
    readonly binaryMatchesDeployment?: boolean | null;
    readonly binarySize?: number | null;
    readonly idl?: unknown | null;
    readonly idlHash?: string | null;
    readonly workspaceId: string;
  }): Promise<void> {
    await this.sql`
      UPDATE program_source_workspaces
      SET
        binary_hash = COALESCE(${input.binaryHash ?? null}, binary_hash),
        binary_matches_deployment = COALESCE(
          ${input.binaryMatchesDeployment ?? null}, binary_matches_deployment
        ),
        binary_size = COALESCE(${input.binarySize ?? null}, binary_size),
        idl = COALESCE(
          ${input.idl === undefined || input.idl === null ? null : this.sql.json(jsonValue(input.idl))},
          idl
        ),
        idl_hash = COALESCE(${input.idlHash ?? null}, idl_hash),
        updated_at = now()
      WHERE id = ${input.workspaceId}
    `;
  }

  public async saveProgramFixReviews(
    analysisId: string,
    findings: ProgramSecurityAnalysis["corrections"],
  ): Promise<readonly ProgramFixReview[]> {
    const reviews: ProgramFixReview[] = [];
    for (const finding of findings) {
      if (finding.patches.length === 0) continue;
      const [row] = await this.sql<ProgramFixReviewRow[]>`
        INSERT INTO program_fix_reviews (analysis_id, finding_id, patches)
        VALUES (
          ${analysisId}, ${finding.id},
          ${this.sql.json(jsonValue(finding.patches))}
        )
        ON CONFLICT (analysis_id, finding_id) DO UPDATE SET
          patches = CASE
            WHEN program_fix_reviews.status = 'proposed' THEN EXCLUDED.patches
            ELSE program_fix_reviews.patches
          END,
          updated_at = now()
        RETURNING *
      `;
      if (row !== undefined) reviews.push(mapFixReview(row));
    }
    return reviews;
  }

  public async listProgramFixReviews(
    analysisId: string,
  ): Promise<readonly ProgramFixReview[]> {
    const rows = await this.sql<ProgramFixReviewRow[]>`
      SELECT * FROM program_fix_reviews
      WHERE analysis_id = ${analysisId}
      ORDER BY created_at ASC, id ASC
    `;
    return rows.map(mapFixReview);
  }

  public async getProgramFixReview(
    analysisId: string,
    findingId: string,
  ): Promise<ProgramFixReview | null> {
    const [row] = await this.sql<ProgramFixReviewRow[]>`
      SELECT * FROM program_fix_reviews
      WHERE analysis_id = ${analysisId} AND finding_id = ${findingId}
      LIMIT 1
    `;
    return row === undefined ? null : mapFixReview(row);
  }

  public async decideProgramFixReview(input: {
    readonly analysisId: string;
    readonly branchName?: string | null;
    readonly findingId: string;
    readonly pullRequestUrl?: string | null;
    readonly status: "applied" | "rejected";
  }): Promise<ProgramFixReview | null> {
    const [row] = await this.sql<ProgramFixReviewRow[]>`
      UPDATE program_fix_reviews
      SET status = ${input.status},
          branch_name = ${input.branchName ?? null},
          pull_request_url = ${input.pullRequestUrl ?? null},
          decided_at = now(),
          updated_at = now()
      WHERE analysis_id = ${input.analysisId}
        AND finding_id = ${input.findingId}
        AND status = 'proposed'
      RETURNING *
    `;
    return row === undefined ? null : mapFixReview(row);
  }

  public async createProgramClaim(input: {
    readonly evidence: Readonly<Record<string, unknown>>;
    readonly programId: string;
    readonly projectId: string;
  }): Promise<ProgramClaim> {
    const [row] = await this.sql<ProgramClaimRow[]>`
      INSERT INTO program_claims (program_id, project_id, evidence)
      VALUES (
        ${input.programId}, ${input.projectId},
        ${this.sql.json(jsonValue(input.evidence))}
      )
      ON CONFLICT (program_id, project_id) DO UPDATE SET
        evidence = EXCLUDED.evidence
      RETURNING id, program_id, project_id, status, created_at
    `;
    if (row === undefined) throw new Error("Failed to create program claim");
    return {
      createdAt: row.created_at,
      id: row.id,
      programId: row.program_id,
      projectId: row.project_id,
      status: row.status,
    };
  }

  public async getVerifiedClaim(
    programId: string,
  ): Promise<ProgramClaim | null> {
    const [row] = await this.sql<ProgramClaimRow[]>`
      SELECT id, program_id, project_id, status, created_at
      FROM program_claims
      WHERE program_id = ${programId} AND status = 'verified'
      ORDER BY reviewed_at DESC NULLS LAST, created_at DESC
      LIMIT 1
    `;
    return row === undefined
      ? null
      : {
          createdAt: row.created_at,
          id: row.id,
          programId: row.program_id,
          projectId: row.project_id,
          status: row.status,
        };
  }

  public async recordMetric(input: {
    readonly metadata?: Readonly<Record<string, unknown>>;
    readonly metricName: string;
    readonly programId?: string;
    readonly projectId?: string;
  }): Promise<void> {
    await this.sql`
      INSERT INTO product_metrics (
        metric_name, program_id, project_id, metadata
      ) VALUES (
        ${input.metricName}, ${input.programId ?? null},
        ${input.projectId ?? null},
        ${this.sql.json(jsonValue(input.metadata ?? {}))}
      )
    `;
  }

  public async metricCounts(
    input: { readonly projectId?: string } = {},
  ): Promise<Readonly<Record<string, number>>> {
    const rows = await this.sql<
      { readonly count: string; readonly metric_name: string }[]
    >`
      SELECT metric_name, count(*)::text AS count
      FROM product_metrics
      WHERE (${input.projectId ?? null}::text IS NULL OR project_id = ${input.projectId ?? null})
      GROUP BY metric_name
    `;
    return Object.fromEntries(
      rows.map((row) => [row.metric_name, Number(row.count)]),
    );
  }

  public async createAlertDestination(input: {
    readonly destination: string;
    readonly enabled?: boolean;
    readonly minSeverity: SecurityEvent["severity"];
    readonly projectId: string;
    readonly secretCiphertext: string;
    readonly type: AlertDestinationType;
  }): Promise<AlertDestination> {
    await this.createProject(input.projectId, input.projectId);
    const [row] = await this.sql<AlertDestinationRow[]>`
      INSERT INTO alert_destinations (
        project_id, type, destination, secret_ciphertext, min_severity, enabled
      ) VALUES (
        ${input.projectId}, ${input.type}, ${input.destination},
        ${input.secretCiphertext}, ${input.minSeverity}, ${input.enabled ?? true}
      )
      ON CONFLICT (project_id, type, destination) DO UPDATE SET
        secret_ciphertext = EXCLUDED.secret_ciphertext,
        min_severity = EXCLUDED.min_severity,
        enabled = EXCLUDED.enabled,
        updated_at = now()
      RETURNING *
    `;
    if (row === undefined)
      throw new Error("Failed to create alert destination");
    return mapAlertDestination(row);
  }

  public async listAlertDestinations(
    projectId: string,
  ): Promise<readonly AlertDestination[]> {
    const rows = await this.sql<AlertDestinationRow[]>`
      SELECT * FROM alert_destinations
      WHERE project_id = ${projectId}
      ORDER BY created_at DESC, id DESC
    `;
    return rows.map(mapAlertDestination);
  }

  public async enqueueAlertDeliveries(
    events: readonly SecurityEvent[],
  ): Promise<void> {
    if (events.length === 0) return;
    const eventIds = events.map((event) => event.id);
    await this.sql`
      INSERT INTO alert_deliveries (security_event_id, destination_id)
      SELECT DISTINCT events.id, destinations.id
      FROM security_events events
      JOIN organization_program_monitors monitors
        ON monitors.program_id = events.program_id
      JOIN alert_destinations destinations
        ON destinations.project_id = monitors.organization_id
       AND destinations.enabled = true
      WHERE events.id = ANY(${eventIds}::uuid[])
      ON CONFLICT (security_event_id, destination_id) DO NOTHING
    `;
  }

  public async claimDueDeliveries(
    now: Date,
    limit: number,
  ): Promise<readonly PendingAlertDelivery[]> {
    return this.sql.begin(async (transaction) => {
      const claimed = await transaction<{ readonly id: string }[]>`
        WITH due AS (
          SELECT id
          FROM alert_deliveries
          WHERE status IN ('pending', 'failed')
            AND next_attempt_at <= ${now}
          ORDER BY next_attempt_at ASC, created_at ASC
          FOR UPDATE SKIP LOCKED
          LIMIT ${limit}
        )
        UPDATE alert_deliveries deliveries
        SET status = 'processing', updated_at = now()
        FROM due
        WHERE deliveries.id = due.id
        RETURNING deliveries.id
      `;
      if (claimed.length === 0) return [];
      const ids = claimed.map((row) => row.id);
      const rows = await transaction<PendingAlertDeliveryRow[]>`
        SELECT
          deliveries.id AS delivery_id,
          deliveries.attempts,
          destinations.id AS destination_id,
          destinations.project_id,
          destinations.type AS destination_type,
          destinations.destination,
          destinations.secret_ciphertext,
          destinations.min_severity,
          destinations.enabled AS destination_enabled,
          events.id,
          events.program_id,
          events.type,
          events.severity,
          events.previous_snapshot_id,
          events.current_snapshot_id,
          events.evidence,
          events.detected_at,
          programs.address AS program_address
        FROM alert_deliveries deliveries
        JOIN alert_destinations destinations
          ON destinations.id = deliveries.destination_id
        JOIN security_events events
          ON events.id = deliveries.security_event_id
        JOIN programs ON programs.id = events.program_id
        WHERE deliveries.id = ANY(${ids}::uuid[])
        ORDER BY deliveries.created_at ASC
      `;
      return rows.map((row) => ({
        attempts: row.attempts,
        deliveryId: row.delivery_id,
        destination: {
          destination: row.destination,
          enabled: row.destination_enabled,
          id: row.destination_id,
          minSeverity: row.min_severity,
          projectId: row.project_id,
          secretCiphertext: row.secret_ciphertext,
          type: row.destination_type,
        },
        event: mapSecurityEvent(row),
        programAddress: row.program_address,
      }));
    });
  }

  public async markDeliverySucceeded(
    deliveryId: string,
    deliveredAt: Date,
    responseStatus: number,
  ): Promise<void> {
    await this.sql`
      UPDATE alert_deliveries SET
        status = 'delivered', attempts = attempts + 1,
        response_status = ${responseStatus}, sent_at = ${deliveredAt},
        last_error = NULL, updated_at = now()
      WHERE id = ${deliveryId}
    `;
    await this.recordMetric({
      metadata: { responseStatus },
      metricName: "alerts_delivered",
    });
  }

  public async markDeliveryFailed(input: {
    readonly attempts: number;
    readonly deliveryId: string;
    readonly error: string;
    readonly nextAttemptAt: Date | null;
  }): Promise<void> {
    await this.sql`
      UPDATE alert_deliveries SET
        status = ${input.nextAttemptAt === null ? "dead" : "failed"},
        attempts = ${input.attempts}, last_error = ${input.error.slice(0, 1000)},
        next_attempt_at = ${input.nextAttemptAt ?? new Date()}, updated_at = now()
      WHERE id = ${input.deliveryId}
    `;
  }

  public async getLatestSnapshot(
    programId: string,
  ): Promise<VersionSnapshot | null> {
    return this.findLatestSnapshot(this.sql, programId);
  }

  public async getLatestSnapshotPairByAddress(
    address: string,
    cluster: Cluster,
  ): Promise<{
    readonly current: VersionSnapshot;
    readonly previous: VersionSnapshot;
  } | null> {
    const rows = await this.sql<SnapshotRow[]>`
      SELECT snapshots.*
      FROM version_snapshots snapshots
      JOIN programs ON programs.id = snapshots.program_id
      WHERE programs.address = ${address} AND programs.cluster = ${cluster}
      ORDER BY snapshots.observed_slot DESC, snapshots.created_at DESC, snapshots.id DESC
      LIMIT 2
    `;
    const [current, previous] = rows;
    return current === undefined || previous === undefined
      ? null
      : { current: mapSnapshot(current), previous: mapSnapshot(previous) };
  }

  public async getProgram(programId: string): Promise<MonitoredProgram | null> {
    const [row] = await this.sql<ProgramRow[]>`
      SELECT id, cluster, address, programdata_address, monitoring_status
      FROM programs WHERE id = ${programId}
    `;
    return row === undefined ? null : mapProgram(row);
  }

  public async getSecurityEventsForPair(
    previousSnapshotId: string,
    currentSnapshotId: string,
  ): Promise<readonly SecurityEvent[]> {
    const rows = await this.sql<SecurityEventRow[]>`
      SELECT * FROM security_events
      WHERE previous_snapshot_id = ${previousSnapshotId}
        AND current_snapshot_id = ${currentSnapshotId}
      ORDER BY created_at ASC, type ASC
    `;
    return rows.map(mapSecurityEvent);
  }

  public async listActivePrograms(
    cluster: Cluster,
  ): Promise<readonly MonitoredProgram[]> {
    const rows = await this.sql<ProgramRow[]>`
      SELECT id, cluster, address, programdata_address, monitoring_status
      FROM programs
      WHERE monitoring_status != 'unsupported' AND cluster = ${cluster}
      ORDER BY created_at ASC
    `;
    return rows.map(mapProgram);
  }

  public async persistBaseline(
    programId: string,
    candidate: SnapshotCandidate,
  ): Promise<VersionSnapshot> {
    return this.sql.begin(async (transaction) => {
      await transaction`
        SELECT id FROM programs WHERE id = ${programId} FOR UPDATE
      `;
      const existing = await this.findLatestSnapshot(transaction, programId);
      if (existing !== null) return existing;
      const [row] = await this.insertSnapshot(
        transaction,
        programId,
        candidate,
      );
      if (row === undefined) throw new Error("Failed to persist baseline");
      const snapshot = mapSnapshot(row);
      await this.persistArtifacts(transaction, snapshot);
      await transaction`
        INSERT INTO product_metrics (metric_name, program_id, metadata)
        VALUES ('snapshots_created', ${programId}, '{}'::jsonb)
      `;
      return snapshot;
    });
  }

  public async persistTransition(
    programId: string,
    previousSnapshotId: string,
    candidate: SnapshotCandidate,
    eventCandidates: readonly SecurityEventCandidate[],
  ): Promise<PersistedTransition> {
    return this.sql.begin(async (transaction) => {
      const firstEvent = eventCandidates[0];
      if (
        eventCandidates.some(
          (event) =>
            event.currentFingerprint !== candidate.fingerprint ||
            event.programId !== programId ||
            event.previousSnapshotId !== previousSnapshotId,
        )
      ) {
        throw new Error("Event candidate fingerprint does not match snapshot");
      }

      await transaction`
        SELECT id FROM programs WHERE id = ${programId} FOR UPDATE
      `;
      const latest = await this.findLatestSnapshot(transaction, programId);
      if (latest === null) {
        throw new Error("Cannot persist a transition without a baseline");
      }
      if (latest.fingerprint === candidate.fingerprint) {
        const events = await transaction<SecurityEventRow[]>`
          SELECT * FROM security_events
          WHERE previous_snapshot_id = ${previousSnapshotId}
            AND current_snapshot_id = ${latest.id}
          ORDER BY created_at ASC, type ASC
        `;
        return {
          events: events.map(mapSecurityEvent),
          inserted: false,
          outcome: "duplicate" as const,
          snapshot: latest,
        };
      }
      if (latest.id !== previousSnapshotId) {
        return {
          events: [],
          inserted: false,
          outcome: "stale" as const,
          snapshot: latest,
        };
      }

      const [snapshotRow] = await this.insertSnapshot(
        transaction,
        programId,
        candidate,
      );
      if (snapshotRow === undefined) {
        throw new Error("Failed to persist transition snapshot");
      }
      const snapshot = mapSnapshot(snapshotRow);

      await this.persistArtifacts(transaction, snapshot);

      await transaction`
        UPDATE programs SET
          programdata_address = ${candidate.programDataAddress},
          updated_at = now()
        WHERE id = ${programId}
      `;

      for (const event of eventCandidates) {
        await transaction`
          INSERT INTO security_events (
            program_id, type, severity, previous_snapshot_id,
            current_snapshot_id, evidence, rule_engine_version, detected_at
          ) VALUES (
            ${event.programId}, ${event.type}, ${event.severity},
            ${event.previousSnapshotId}, ${snapshot.id},
            ${transaction.json(jsonValue(event.evidence))},
            ${event.ruleEngineVersion}, ${event.detectedAt}
          )
          ON CONFLICT (previous_snapshot_id, current_snapshot_id, type)
          DO NOTHING
        `;
      }

      await transaction`
        INSERT INTO product_metrics (metric_name, program_id, metadata)
        VALUES ('snapshots_created', ${programId}, '{}'::jsonb)
      `;
      for (const event of eventCandidates) {
        const metricName =
          event.type === "PROGRAM_UPGRADED"
            ? "upgrades_detected"
            : event.type === "AUTHORITY_CHANGED" ||
                event.type === "PROGRAM_BECAME_IMMUTABLE"
              ? "authority_changes_detected"
              : event.type === "IDL_CHANGED"
                ? "idl_changes_detected"
                : null;
        if (metricName !== null) {
          await transaction`
            INSERT INTO product_metrics (metric_name, program_id, metadata)
            VALUES (
              ${metricName}, ${programId},
              ${transaction.json(jsonValue({ eventType: event.type }))}
            )
          `;
        }
      }

      const rows =
        firstEvent === undefined
          ? []
          : await transaction<SecurityEventRow[]>`
              SELECT * FROM security_events
              WHERE previous_snapshot_id = ${firstEvent.previousSnapshotId}
                AND current_snapshot_id = ${snapshot.id}
              ORDER BY created_at ASC, type ASC
            `;

      return {
        events: rows.map(mapSecurityEvent),
        inserted: true,
        outcome: "inserted" as const,
        snapshot,
      };
    });
  }

  public async recordReconciliation(
    programId: string,
    status: MonitoringStatus,
    reconciledAt: Date,
  ): Promise<void> {
    await this.sql`
      UPDATE programs SET
        monitoring_status = ${status},
        last_reconciled_at = ${reconciledAt},
        updated_at = now()
      WHERE id = ${programId}
    `;
  }

  public async setMonitoringStatus(
    programId: string,
    status: MonitoringStatus,
  ): Promise<void> {
    await this.sql`
      UPDATE programs SET monitoring_status = ${status}, updated_at = now()
      WHERE id = ${programId}
    `;
  }

  private async findLatestSnapshot(
    sql: QuerySql,
    programId: string,
  ): Promise<VersionSnapshot | null> {
    const [row] = await sql<SnapshotRow[]>`
      SELECT * FROM version_snapshots
      WHERE program_id = ${programId}
      ORDER BY observed_slot DESC, created_at DESC, id DESC
      LIMIT 1
    `;
    return row === undefined ? null : mapSnapshot(row);
  }

  private insertSnapshot(
    sql: QuerySql,
    programId: string,
    candidate: SnapshotCandidate,
  ): Promise<SnapshotRow[]> {
    return sql<SnapshotRow[]>`
      INSERT INTO version_snapshots (
        program_id, program_address, programdata_address, program_owner,
        program_executable,
        deployment_slot, observed_slot, executable_hash, account_data_hash,
        executable_size, upgrade_authority, fingerprint, idl_hash,
        idl, idl_instructions, metadata_hash, source_reference_hash,
        source_repository_url, source_revision, source_verification_status,
        verification_status, trusted_fingerprint, observed_at
      ) VALUES (
        ${programId}, ${candidate.programAddress}, ${candidate.programDataAddress},
        ${candidate.programOwner}, ${candidate.programExecutable},
        ${candidate.deploymentSlot.toString()},
        ${candidate.observedSlot.toString()}, ${candidate.executableHash},
        ${candidate.accountDataHash}, ${candidate.executableSize},
        ${candidate.upgradeAuthority}, ${candidate.fingerprint}, ${candidate.idlHash},
        ${candidate.idl === null ? null : sql.json(jsonValue(candidate.idl))},
        ${
          candidate.idlInstructions === null
            ? null
            : sql.json(jsonValue(candidate.idlInstructions))
        },
        ${candidate.metadataHash}, ${candidate.sourceReferenceHash},
        ${candidate.sourceRepositoryUrl}, ${candidate.sourceRevision},
        ${candidate.sourceVerificationStatus},
        ${candidate.verificationStatus}, ${candidate.trustedFingerprint},
        ${candidate.observedAt}
      )
      RETURNING *
    `;
  }

  private async persistArtifacts(
    sql: QuerySql,
    snapshot: VersionSnapshot,
  ): Promise<void> {
    if (snapshot.idl !== null) {
      await sql`
        INSERT INTO program_artifacts (
          program_snapshot_id, artifact_type, artifact_hash,
          verification_status, artifact_json
        ) VALUES (
          ${snapshot.id}, 'IDL', ${snapshot.idlHash},
          ${snapshot.verificationStatus}, ${sql.json(jsonValue(snapshot.idl))}
        )
        ON CONFLICT (program_snapshot_id, artifact_type) DO NOTHING
      `;
    }

    if (snapshot.metadataHash !== null) {
      await sql`
        INSERT INTO program_artifacts (
          program_snapshot_id, artifact_type, artifact_hash,
          source_url, revision, verification_status, artifact_json
        ) VALUES (
          ${snapshot.id}, 'SOURCE_METADATA', ${snapshot.metadataHash},
          ${snapshot.sourceRepositoryUrl}, ${snapshot.sourceRevision},
          ${snapshot.sourceVerificationStatus},
          ${sql.json(
            jsonValue({
              repositoryUrl: snapshot.sourceRepositoryUrl,
              revision: snapshot.sourceRevision,
            }),
          )}
        )
        ON CONFLICT (program_snapshot_id, artifact_type) DO NOTHING
      `;
    }

    if (snapshot.sourceRepositoryUrl !== null) {
      await sql`
        INSERT INTO program_artifacts (
          program_snapshot_id, artifact_type, artifact_hash,
          source_url, revision, verification_status, artifact_json
        ) VALUES (
          ${snapshot.id}, 'REPOSITORY', ${snapshot.sourceReferenceHash},
          ${snapshot.sourceRepositoryUrl}, ${snapshot.sourceRevision},
          ${snapshot.sourceVerificationStatus},
          ${sql.json(
            jsonValue({ repositoryUrl: snapshot.sourceRepositoryUrl }),
          )}
        )
        ON CONFLICT (program_snapshot_id, artifact_type) DO NOTHING
      `;
    }

    if (snapshot.sourceVerificationStatus === "verified") {
      await sql`
        INSERT INTO program_artifacts (
          program_snapshot_id, artifact_type, artifact_hash,
          source_url, revision, verification_status, artifact_json
        ) VALUES (
          ${snapshot.id}, 'VERIFIED_BUILD', ${snapshot.executableHash},
          ${snapshot.sourceRepositoryUrl}, ${snapshot.sourceRevision},
          'verified', ${sql.json(
            jsonValue({
              executableHash: snapshot.executableHash,
              fingerprint: snapshot.fingerprint,
            }),
          )}
        )
        ON CONFLICT (program_snapshot_id, artifact_type) DO NOTHING
      `;
    }
  }
}

export interface PostgresStoreOptions {
  readonly maxConnections?: number;
  readonly ssl?: boolean;
}

export function createPostgresStore(
  databaseUrl: string,
  options: PostgresStoreOptions = {},
): {
  readonly close: () => Promise<void>;
  readonly store: PostgresProgramStore;
} {
  const isSupabase =
    databaseUrl.includes("supabase.com") || databaseUrl.includes("supabase.co");
  const sql = postgres(databaseUrl, {
    max: options.maxConnections ?? (isSupabase ? 1 : 10),
    prepare: false,
    ssl: (options.ssl ?? isSupabase) ? "require" : false,
  });
  return {
    close: async () => sql.end(),
    store: new PostgresProgramStore(sql),
  };
}
