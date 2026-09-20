import { Buffer } from "node:buffer";

import { describe, expect, it } from "vitest";
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

import { createPostgresStore } from "../src/postgres-store.js";

const databaseUrl = process.env.TEST_DATABASE_URL;

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
  });
});
