import type {
  CreateProgramInput,
  PersistedTransition,
  ProgramStore,
} from "@usekratose/application";
import type {
  Cluster,
  MonitoredProgram,
  MonitoringStatus,
  SecurityEvent,
  SecurityEventCandidate,
  SnapshotCandidate,
  VerificationStatus,
  VersionSnapshot,
} from "@usekratose/core";
import postgres, { type Sql, type TransactionSql } from "postgres";

type QuerySql = Sql | TransactionSql;

interface ProgramRow {
  address: string;
  cluster: Cluster;
  id: string;
  monitoring_status: MonitoringStatus;
  programdata_address: string;
}

interface SnapshotRow {
  account_data_hash: string;
  deployment_slot: string;
  executable_hash: string;
  executable_size: number;
  fingerprint: string;
  id: string;
  idl_hash: string | null;
  idl_instructions: readonly string[] | null;
  metadata_hash: string | null;
  observed_at: Date;
  observed_slot: string;
  program_address: string;
  program_id: string;
  program_owner: string;
  programdata_address: string;
  source_reference_hash: string | null;
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

function mapProgram(row: ProgramRow): MonitoredProgram {
  return {
    address: row.address,
    cluster: row.cluster,
    id: row.id,
    monitoringStatus: row.monitoring_status,
    programDataAddress: row.programdata_address,
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
    idlHash: row.idl_hash,
    idlInstructions: row.idl_instructions,
    metadataHash: row.metadata_hash,
    observedAt: row.observed_at,
    observedSlot: BigInt(row.observed_slot),
    programAddress: row.program_address,
    programDataAddress: row.programdata_address,
    programId: row.program_id,
    programOwner: row.program_owner,
    sourceReferenceHash: row.source_reference_hash,
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

export class PostgresProgramStore implements ProgramStore {
  public constructor(private readonly sql: Sql) {}

  public async addOrganizationMonitor(
    organizationId: string,
    programId: string,
  ): Promise<void> {
    await this.sql`
      INSERT INTO organization_program_monitors (organization_id, program_id)
      VALUES (${organizationId}, ${programId})
      ON CONFLICT DO NOTHING
    `;
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
    if (row !== undefined) return mapSnapshot(row);
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
        deployment_slot, observed_slot, executable_hash, account_data_hash,
        executable_size, upgrade_authority, fingerprint, idl_hash,
        idl_instructions, metadata_hash, source_reference_hash,
        verification_status, trusted_fingerprint, observed_at
      ) VALUES (
        ${programId}, ${candidate.programAddress}, ${candidate.programDataAddress},
        ${candidate.programOwner}, ${candidate.deploymentSlot.toString()},
        ${candidate.observedSlot.toString()}, ${candidate.executableHash},
        ${candidate.accountDataHash}, ${candidate.executableSize},
        ${candidate.upgradeAuthority}, ${candidate.fingerprint}, ${candidate.idlHash},
        ${candidate.idlInstructions === null ? null : JSON.stringify(candidate.idlInstructions)}::jsonb,
        ${candidate.metadataHash}, ${candidate.sourceReferenceHash},
        ${candidate.verificationStatus}, ${candidate.trustedFingerprint},
        ${candidate.observedAt}
      )
      ON CONFLICT (program_id, fingerprint) DO NOTHING
      RETURNING *
    `;
  }
}

export function createPostgresStore(databaseUrl: string): {
  readonly close: () => Promise<void>;
  readonly store: PostgresProgramStore;
} {
  const sql = postgres(databaseUrl, { max: 10, prepare: false });
  return {
    close: async () => sql.end(),
    store: new PostgresProgramStore(sql),
  };
}
