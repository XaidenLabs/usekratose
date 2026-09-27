import { Buffer } from "node:buffer";

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  AlertDispatcher,
  encryptSecret,
  type WebhookTransport,
} from "@usekratose/alerts";
import { ApiKeyService } from "@usekratose/application";
import {
  createSecurityEventCandidates,
  type SnapshotCandidate,
  type VersionSnapshot,
} from "@usekratose/core";
import postgres from "postgres";

import { createPostgresStore } from "../src/postgres-store.js";

const databaseUrl = process.env.TEST_DATABASE_URL;
const cleanupSql =
  databaseUrl === undefined
    ? null
    : postgres(databaseUrl, {
        max: 1,
        prepare: false,
        ssl:
          databaseUrl.includes("supabase.com") ||
          databaseUrl.includes("supabase.co")
            ? "require"
            : false,
      });

async function cleanupTestData(): Promise<void> {
  if (cleanupSql === null) return;
  await cleanupSql`
    DELETE FROM product_metrics
    WHERE project_id LIKE 'e2e-%'
      OR program_id IN (
        SELECT id FROM programs WHERE address LIKE 'Fixture%'
      )
  `;
  await cleanupSql`DELETE FROM programs WHERE address LIKE 'Fixture%'`;
  await cleanupSql`
    DELETE FROM projects
    WHERE id LIKE 'e2e-%' OR id LIKE 'owned-%' OR id LIKE 'ignored-%'
  `;
}

beforeAll(cleanupTestData);
afterAll(async () => {
  await cleanupTestData();
  await cleanupSql?.end();
});

function candidate(version: 1 | 2): SnapshotCandidate {
  const current = version === 2;
  return {
    accountDataHash: `sha256:account-v${version}`,
    deploymentSlot: current ? 200n : 100n,
    executableHash: `sha256:executable-v${version}`,
    executableSize: current ? 20 : 10,
    fingerprint: `sha256:fingerprint-v${version}`,
    idl: null,
    idlHash: null,
    idlInstructions: null,
    metadataHash: null,
    observedAt: new Date(
      current ? "2026-09-20T12:01:00Z" : "2026-09-20T12:00:00Z",
    ),
    observedSlot: current ? 201n : 101n,
    programAddress: `Fixture${crypto.randomUUID().replaceAll("-", "").slice(0, 32)}`,
    programDataAddress: "ProgramDataFixture1111111111111111111111111",
    programExecutable: true,
    programOwner: "BPFLoaderUpgradeab1e11111111111111111111111",
    sourceReferenceHash: null,
    sourceRepositoryUrl: null,
    sourceRevision: null,
    sourceVerificationStatus: "unavailable",
    trustedFingerprint: current
      ? "sha256:fingerprint-v1"
      : "sha256:fingerprint-v1",
    upgradeAuthority: "AuthorityFixture11111111111111111111111111",
    verificationStatus: current ? "stale" : "verified",
  };
}

class CapturingTransport implements WebhookTransport {
  public readonly bodies: string[] = [];
  public async send(input: {
    readonly body: string;
  }): Promise<{ readonly status: number }> {
    this.bodies.push(input.body);
    return { status: 200 };
  }
}

describe.runIf(databaseUrl !== undefined)("stored platform acceptance", () => {
  it("renames and detaches a workspace program without deleting evidence", async () => {
    if (databaseUrl === undefined) return;
    const database = createPostgresStore(databaseUrl);
    const projectId = `e2e-${crypto.randomUUID()}`;
    const snapshot = candidate(1);
    try {
      const program = await database.store.createOrGetProgram({
        address: snapshot.programAddress,
        cluster: "devnet",
        programDataAddress: snapshot.programDataAddress,
        status: "healthy",
      });
      await database.store.addOrganizationMonitor(projectId, program.id);
      await database.store.persistBaseline(program.id, snapshot);

      await expect(
        database.store.setOrganizationMonitorName(
          projectId,
          program.id,
          "Fixture Treasury",
        ),
      ).resolves.toBe(true);
      await expect(
        database.store.listProgramMonitorsForProject(projectId),
      ).resolves.toEqual([{ displayName: "Fixture Treasury", program }]);

      await expect(
        database.store.removeOrganizationMonitor(projectId, program.id),
      ).resolves.toBe(true);
      await expect(
        database.store.listProgramMonitorsForProject(projectId),
      ).resolves.toEqual([]);
      await expect(
        database.store.listSnapshots(program.id),
      ).resolves.toHaveLength(1);
    } finally {
      await database.close();
    }
  }, 90_000);

  it("binds one project to each authenticated user", async () => {
    if (databaseUrl === undefined) return;
    const database = createPostgresStore(databaseUrl);
    const userId = crypto.randomUUID();
    try {
      const first = await database.store.createProjectForUser({
        name: "Owned project",
        projectId: `owned-${crypto.randomUUID()}`,
        userId,
      });
      const second = await database.store.createProjectForUser({
        name: "Renamed project",
        projectId: `ignored-${crypto.randomUUID()}`,
        userId,
      });

      expect(second.id).toBe(first.id);
      await expect(database.store.getProjectForUser(userId)).resolves.toEqual({
        id: first.id,
        name: "Renamed project",
      });
      await expect(
        database.store.getProjectForUser(crypto.randomUUID()),
      ).resolves.toBeNull();
    } finally {
      await database.close();
    }
  }, 90_000);

  it("round-trips snapshots and event evidence as structured JSON", async () => {
    if (databaseUrl === undefined) return;
    const database = createPostgresStore(databaseUrl);
    const idl = {
      accountTypes: [],
      errors: [],
      instructions: [
        {
          accounts: [
            {
              name: "vault",
              optional: false,
              signer: false,
              writable: true,
            },
          ],
          arguments: [{ name: "amount", type: "u64" }],
          name: "deposit",
        },
      ],
    } as const;
    const v1 = {
      ...candidate(1),
      idl,
      idlHash: "sha256:idl-v1",
      idlInstructions: ["deposit"],
    };
    const v2 = {
      ...candidate(2),
      idl,
      idlHash: "sha256:idl-v1",
      idlInstructions: ["deposit"],
      programAddress: v1.programAddress,
    };
    try {
      const program = await database.store.createOrGetProgram({
        address: v1.programAddress,
        cluster: "devnet",
        programDataAddress: v1.programDataAddress,
        status: "healthy",
      });
      const baseline = await database.store.persistBaseline(program.id, v1);
      expect(baseline.idl).toEqual(idl);
      expect(baseline.idlInstructions).toEqual(["deposit"]);

      const events = createSecurityEventCandidates(baseline, v2, v2.observedAt);
      await database.store.persistTransition(
        program.id,
        baseline.id,
        v2,
        events,
      );

      const snapshots = await database.store.listSnapshots(program.id);
      const storedEvents = await database.store.listSecurityEvents(program.id);
      expect(snapshots[0]?.idl).toEqual(idl);
      expect(snapshots[0]?.idlInstructions).toEqual(["deposit"]);
      expect(
        storedEvents.find((event) => event.type === "PROGRAM_UPGRADED")
          ?.evidence,
      ).toEqual(
        expect.objectContaining({
          currentExecutableHash: "sha256:executable-v2",
          previousExecutableHash: "sha256:executable-v1",
        }),
      );
    } finally {
      await database.close();
    }
  }, 90_000);

  it("rejects a transition built from a stale snapshot", async () => {
    if (databaseUrl === undefined) return;
    const database = createPostgresStore(databaseUrl);
    const v1 = candidate(1);
    const v2 = { ...candidate(2), programAddress: v1.programAddress };
    const v3: SnapshotCandidate = {
      ...v2,
      accountDataHash: "sha256:account-v3",
      deploymentSlot: 300n,
      executableHash: "sha256:executable-v3",
      fingerprint: "sha256:fingerprint-v3",
      observedAt: new Date("2026-09-20T12:02:00Z"),
      observedSlot: 301n,
    };
    try {
      const program = await database.store.createOrGetProgram({
        address: v1.programAddress,
        cluster: "devnet",
        programDataAddress: v1.programDataAddress,
        status: "healthy",
      });
      const baseline = await database.store.persistBaseline(program.id, v1);
      const reingested = await database.store.createOrGetProgram({
        address: v1.programAddress,
        cluster: "devnet",
        programDataAddress: "UnconfirmedProgramData111111111111111111111",
        status: "baselining",
      });
      expect(reingested.programDataAddress).toBe(v1.programDataAddress);
      const v2Events = createSecurityEventCandidates(
        baseline,
        v2,
        v2.observedAt,
      );
      const storedV2 = await database.store.persistTransition(
        program.id,
        baseline.id,
        v2,
        v2Events,
      );

      const staleV3Events = createSecurityEventCandidates(
        baseline,
        v3,
        v3.observedAt,
      );
      const stale = await database.store.persistTransition(
        program.id,
        baseline.id,
        v3,
        staleV3Events,
      );
      expect(stale.outcome).toBe("stale");
      expect(stale.snapshot.id).toBe(storedV2.snapshot.id);
      expect(await database.store.listSnapshots(program.id)).toHaveLength(2);

      const freshV3Events = createSecurityEventCandidates(
        storedV2.snapshot,
        v3,
        v3.observedAt,
      );
      const storedV3 = await database.store.persistTransition(
        program.id,
        storedV2.snapshot.id,
        v3,
        freshV3Events,
      );
      expect(storedV3.outcome).toBe("inserted");
      expect(await database.store.listSnapshots(program.id)).toHaveLength(3);

      const returnedToV2: SnapshotCandidate = {
        ...v2,
        observedAt: new Date("2026-09-20T12:03:00Z"),
        observedSlot: 401n,
      };
      const returnEvents = createSecurityEventCandidates(
        storedV3.snapshot,
        returnedToV2,
        returnedToV2.observedAt,
      );
      const returned = await database.store.persistTransition(
        program.id,
        storedV3.snapshot.id,
        returnedToV2,
        returnEvents,
      );
      expect(returned.outcome).toBe("inserted");
      const snapshots = await database.store.listSnapshots(program.id);
      expect(snapshots).toHaveLength(4);
      expect(snapshots[0]?.fingerprint).toBe(v2.fingerprint);
    } finally {
      await database.close();
    }
  }, 90_000);

  it("persists a v1 to v2 event and delivers it exactly once", async () => {
    if (databaseUrl === undefined) return;
    const database = createPostgresStore(databaseUrl);
    const projectId = `e2e-${crypto.randomUUID()}`;
    const v1 = candidate(1);
    const v2 = { ...candidate(2), programAddress: v1.programAddress };
    try {
      const program = await database.store.createOrGetProgram({
        address: v1.programAddress,
        cluster: "devnet",
        programDataAddress: v1.programDataAddress,
        status: "healthy",
      });
      await database.store.addOrganizationMonitor(projectId, program.id);
      const baseline = await database.store.persistBaseline(program.id, v1);
      const events = createSecurityEventCandidates(baseline, v2, v2.observedAt);
      const transition = await database.store.persistTransition(
        program.id,
        baseline.id,
        v2,
        events,
      );
      expect(transition.events.map((event) => event.type)).toEqual([
        "PROGRAM_UPGRADED",
        "VERIFICATION_STALE",
      ]);

      const encryptionKey = Buffer.alloc(32, 3).toString("base64");
      await database.store.createAlertDestination({
        destination: "https://example.com/usekratose",
        minSeverity: "high",
        projectId,
        secretCiphertext: encryptSecret("fixture-secret", encryptionKey),
        type: "webhook",
      });
      const transport = new CapturingTransport();
      const dispatcher = new AlertDispatcher(
        database.store,
        transport,
        encryptionKey,
      );
      await dispatcher.enqueue(transition.events);
      await dispatcher.enqueue(transition.events);
      const deliveryTime = new Date("2030-01-01T00:00:00Z");
      await dispatcher.deliverDue(deliveryTime);
      const deliveredForProgram = () =>
        transport.bodies.filter((body) => body.includes(v1.programAddress))
          .length;
      expect(deliveredForProgram()).toBe(2);
      await dispatcher.deliverDue(deliveryTime);
      expect(deliveredForProgram()).toBe(2);

      const apiKeys = new ApiKeyService(
        database.store,
        "database-e2e-api-key-pepper-value-1234",
        { now: () => v2.observedAt },
      );
      const key = await apiKeys.create({ name: "E2E", projectId });
      await expect(apiKeys.authenticate(key.key)).resolves.toMatchObject({
        kind: "authenticated",
      });
      await apiKeys.revoke(key.id, projectId);
      await expect(apiKeys.authenticate(key.key)).resolves.toEqual({
        kind: "invalid",
      });

      const snapshots = await database.store.listSnapshots(program.id);
      const storedEvents = await database.store.listSecurityEvents(program.id);
      expect(snapshots).toHaveLength(2);
      expect(storedEvents).toHaveLength(2);
    } finally {
      await database.close();
    }
  }, 90_000);

  it("persists source evidence and one-way fix decisions", async () => {
    if (databaseUrl === undefined) return;
    const database = createPostgresStore(databaseUrl);
    const projectId = `e2e-${crypto.randomUUID()}`;
    const snapshot = candidate(1);
    try {
      const program = await database.store.createOrGetProgram({
        address: snapshot.programAddress,
        cluster: "devnet",
        programDataAddress: snapshot.programDataAddress,
        status: "healthy",
      });
      await database.store.addOrganizationMonitor(projectId, program.id);
      const baseline = await database.store.persistBaseline(
        program.id,
        snapshot,
      );
      const workspace = await database.store.upsertProgramSourceWorkspace({
        programId: program.id,
        projectId,
        provider: "upload",
      });
      await database.store.replaceProgramSourceFiles(workspace.id, [
        {
          language: "rust",
          objectPath: `${projectId}/${program.id}/lib.rs`,
          path: "programs/fixture/src/lib.rs",
          size: 32,
          sourceHash: "sha256:source-v1",
        },
      ]);
      await database.store.saveProgramArtifactEvidence({
        binaryHash: snapshot.executableHash,
        binaryMatchesDeployment: true,
        binarySize: snapshot.executableSize,
        idl: { instructions: [{ name: "withdraw" }] },
        idlHash: "sha256:idl-v1",
        workspaceId: workspace.id,
      });

      const analysis = await database.store.saveProgramAnalysis({
        analysis: {
          caveat: "Review before merging.",
          corrections: [
            {
              correction: "Require the authority signer.",
              fixes: [
                {
                  action: "Add a signer constraint.",
                  rationale: "Privileged state must require authorization.",
                },
              ],
              id: "authority-signer",
              patches: [
                {
                  after: "pub authority: Signer<'info>,",
                  before: "pub authority: AccountInfo<'info>,",
                  path: "programs/fixture/src/lib.rs",
                  rationale: "Enforce transaction authorization.",
                },
              ],
              reason: "The authority account is not required to sign.",
              relatedEventIds: [],
              relatedSnapshotIds: [baseline.id],
              severity: "high",
              title: "Missing authority signer",
            },
          ],
          reviewPriorities: ["Authority validation"],
          summary: "One privileged authorization issue was found.",
        },
        currentSnapshotId: baseline.id,
        evidenceHash: "sha256:evidence-source-flow",
        evidenceInput: {
          attachedIdl: { instructions: [{ name: "withdraw" }] },
          currentSnapshot: { id: baseline.id },
          events: [],
          program: { address: program.address, id: program.id },
          snapshots: [{ id: baseline.id }],
          sourceFiles: [
            {
              content: "pub authority: AccountInfo<'info>,",
              hash: "sha256:source-v1",
              path: "programs/fixture/src/lib.rs",
            },
          ],
        },
        model: "fixture-model",
        programId: program.id,
        promptVersion: "2",
        provider: "fixture",
      });
      const reviews = await database.store.saveProgramFixReviews(
        analysis.id,
        analysis.analysis.corrections,
      );

      await expect(
        database.store.getProgramSourceWorkspace(projectId, program.id),
      ).resolves.toMatchObject({
        binaryMatchesDeployment: true,
        files: [{ path: "programs/fixture/src/lib.rs" }],
        idlHash: "sha256:idl-v1",
        provider: "upload",
      });
      expect(reviews).toHaveLength(1);
      await expect(
        database.store.decideProgramFixReview({
          analysisId: analysis.id,
          findingId: "authority-signer",
          status: "rejected",
        }),
      ).resolves.toMatchObject({ status: "rejected" });
      await expect(
        database.store.decideProgramFixReview({
          analysisId: analysis.id,
          findingId: "authority-signer",
          status: "applied",
        }),
      ).resolves.toBeNull();
    } finally {
      await database.close();
    }
  }, 90_000);
});
