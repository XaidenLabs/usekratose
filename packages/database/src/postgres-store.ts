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
  SecurityExplanation,
  UnexplainedSecurityEvent,
} from "@usekratose/explanations";
import postgres, { type Sql, type TransactionSql } from "postgres";

type QuerySql = Sql | TransactionSql;

interface ProgramRow {
  address: string;
  cluster: Cluster;
  id: string;
  monitoring_status: MonitoringStatus;
  programdata_address: string;
}

interface ApiKeyRow {
  id: string;
  key_prefix: string;
  name: string;
  project_id: string;
  revoked_at: Date | null;
}

interface SnapshotRow {
  account_data_hash: string;
  deployment_slot: string;
  executable_hash: string;
  executable_size: number;
  fingerprint: string;
  id: string;
  idl: NormalizedIdl | null;
  idl_hash: string | null;
  idl_instructions: readonly string[] | null;
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
  evidence: Readonly<Record<string, unknown>>;
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

interface ProgramClaimRow {
  created_at: Date;
  id: string;
  program_id: string;
  project_id: string;
  status: ProgramClaim["status"];
}

interface ExplanationRow {
  created_at: Date;
  explanation: SecurityExplanation;
  model: string;
  prompt_version: string;
  provider: string;
  security_event_id: string;
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

function mapSnapshot(row: SnapshotRow): VersionSnapshot {
  return {
    accountDataHash: row.account_data_hash,
    deploymentSlot: BigInt(row.deployment_slot),
    executableHash: row.executable_hash,
    executableSize: row.executable_size,
    fingerprint: row.fingerprint,
    id: row.id,
    idl: row.idl,
    idlHash: row.idl_hash,
    idlInstructions: row.idl_instructions,
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
    evidence: row.evidence,
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
      INSERT INTO organization_program_monitors (organization_id, program_id)
      VALUES (${organizationId}, ${programId})
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
        programdata_address = EXCLUDED.programdata_address,
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
    readonly limit: number;
    readonly model: string;
    readonly promptVersion: string;
    readonly provider: string;
  }): Promise<readonly UnexplainedSecurityEvent[]> {
    const rows = await this.sql<
      (SecurityEventRow & { readonly program_address: string })[]
    >`
      SELECT events.*, programs.address AS program_address
      FROM security_events events
      JOIN programs ON programs.id = events.program_id
      WHERE NOT EXISTS (
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
        ${JSON.stringify(input.evidenceInput)}::jsonb,
        ${JSON.stringify(input.explanation)}::jsonb
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
      explanation: row.explanation,
      model: row.model,
      promptVersion: row.prompt_version,
      provider: row.provider,
    }));
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
        ${JSON.stringify(input.evidence)}::jsonb
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
        ${JSON.stringify(input.metadata ?? {})}::jsonb
      )
    `;
  }

  public async metricCounts(): Promise<Readonly<Record<string, number>>> {
    const rows = await this.sql<
      { readonly count: string; readonly metric_name: string }[]
    >`
      SELECT metric_name, count(*)::text AS count
      FROM product_metrics
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
    const [row] = await this.sql<SnapshotRow[]>`
      SELECT * FROM version_snapshots
      WHERE program_id = ${programId}
      ORDER BY observed_slot DESC, created_at DESC, id DESC
      LIMIT 1
    `;
    return row === undefined ? null : mapSnapshot(row);
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
    const [row] = await this.insertSnapshot(this.sql, programId, candidate);
    if (row !== undefined) {
      const snapshot = mapSnapshot(row);
      await this.persistArtifacts(this.sql, snapshot);
      await this.recordMetric({
        metricName: "snapshots_created",
        programId,
      });
      return snapshot;
    }
    const existing = await this.findSnapshotByFingerprint(
      this.sql,
      programId,
      candidate.fingerprint,
    );
    if (existing === null) throw new Error("Failed to persist baseline");
    return existing;
  }

  public async persistTransition(
    programId: string,
    candidate: SnapshotCandidate,
    eventCandidates: readonly SecurityEventCandidate[],
  ): Promise<PersistedTransition> {
    return this.sql.begin(async (transaction) => {
      const firstEvent = eventCandidates[0];
      if (
        eventCandidates.some(
          (event) =>
            event.currentFingerprint !== candidate.fingerprint ||
            event.programId !== programId,
        )
      ) {
        throw new Error("Event candidate fingerprint does not match snapshot");
      }

      const [snapshotRow] = await this.insertSnapshot(
        transaction,
        programId,
        candidate,
      );
      const snapshot =
        snapshotRow === undefined
          ? await this.findSnapshotByFingerprint(
              transaction,
              programId,
              candidate.fingerprint,
            )
          : mapSnapshot(snapshotRow);
      if (snapshot === null)
        throw new Error("Failed to persist transition snapshot");

      if (snapshotRow !== undefined) {
        await this.persistArtifacts(transaction, snapshot);
      }

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
            ${JSON.stringify(event.evidence)}::jsonb,
            ${event.ruleEngineVersion}, ${event.detectedAt}
          )
          ON CONFLICT (previous_snapshot_id, current_snapshot_id, type)
          DO NOTHING
        `;
      }

      if (snapshotRow !== undefined) {
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
                ${JSON.stringify({ eventType: event.type })}::jsonb
              )
            `;
          }
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
        inserted: snapshotRow !== undefined,
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

  private async findSnapshotByFingerprint(
    sql: QuerySql,
    programId: string,
    fingerprint: string,
  ): Promise<VersionSnapshot | null> {
    const [row] = await sql<SnapshotRow[]>`
      SELECT * FROM version_snapshots
      WHERE program_id = ${programId} AND fingerprint = ${fingerprint}
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
        ${candidate.idl === null ? null : JSON.stringify(candidate.idl)}::jsonb,
        ${candidate.idlInstructions === null ? null : JSON.stringify(candidate.idlInstructions)}::jsonb,
        ${candidate.metadataHash}, ${candidate.sourceReferenceHash},
        ${candidate.sourceRepositoryUrl}, ${candidate.sourceRevision},
        ${candidate.sourceVerificationStatus},
        ${candidate.verificationStatus}, ${candidate.trustedFingerprint},
        ${candidate.observedAt}
      )
      ON CONFLICT (program_id, fingerprint) DO NOTHING
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
          ${snapshot.verificationStatus}, ${JSON.stringify(snapshot.idl)}::jsonb
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
          ${JSON.stringify({
            repositoryUrl: snapshot.sourceRepositoryUrl,
            revision: snapshot.sourceRevision,
          })}::jsonb
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
          ${JSON.stringify({ repositoryUrl: snapshot.sourceRepositoryUrl })}::jsonb
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
          'verified', ${JSON.stringify({
            executableHash: snapshot.executableHash,
            fingerprint: snapshot.fingerprint,
          })}::jsonb
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
  const isSupabase = databaseUrl.includes("supabase.com");
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
