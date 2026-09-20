import {
  diffSnapshots,
  formatProgramDiffReport,
  type Cluster,
} from "@usekratose/core";
import { createPostgresStore } from "@usekratose/database";
import { z } from "zod";

const environmentSchema = z.object({
  DATABASE_URL: z.string().url(),
  SOLANA_CLUSTER: z.enum(["devnet", "mainnet-beta"]),
});

const programAddress = process.argv[2];
const jsonOutput = process.argv.includes("--json");
if (programAddress === undefined) {
  throw new Error(
    "Usage: pnpm --filter @usekratose/monitor security:diff <PROGRAM_ID>",
  );
}

const environment = environmentSchema.parse(process.env);
const database = createPostgresStore(environment.DATABASE_URL);

try {
  const pair = await database.store.getLatestSnapshotPairByAddress(
    programAddress,
    environment.SOLANA_CLUSTER satisfies Cluster,
  );
  if (pair === null) {
    throw new Error(
      `Two stored snapshots were not found for ${programAddress} on ${environment.SOLANA_CLUSTER}`,
    );
  }
  const events = await database.store.getSecurityEventsForPair(
    pair.previous.id,
    pair.current.id,
  );
  console.log(
    jsonOutput
      ? JSON.stringify(
          {
            currentSnapshotId: pair.current.id,
            diff: diffSnapshots(pair.previous, pair.current),
            events,
            previousSnapshotId: pair.previous.id,
            programId: pair.current.programAddress,
            source: {
              currentRevision: pair.current.sourceRevision,
              previousRevision: pair.previous.sourceRevision,
              repositoryUrl: pair.current.sourceRepositoryUrl,
              verificationStatus: pair.current.sourceVerificationStatus,
            },
          },
          null,
          2,
        )
      : formatProgramDiffReport({
          current: pair.current,
          events,
          previous: pair.previous,
        }),
  );
} finally {
  await database.close();
}
