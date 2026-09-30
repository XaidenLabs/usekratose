import { readFile } from "node:fs/promises";

import { ProgramIngestionService } from "@usekratose/application";
import { createPostgresStore } from "@usekratose/database";
import { SolanaRpcClient } from "@usekratose/solana";
import { z } from "zod";

import { loadLocalEnvironment } from "./load-local-environment.js";

const fixtureSchema = z.array(
  z.object({
    address: z.string().min(32).max(44),
    deploymentSlot: z.number().int().nonnegative(),
    executableHash: z.string().regex(/^[a-f0-9]{64}$/),
    name: z.string().min(1),
    network: z.literal("devnet"),
    programDataAddress: z.string().min(32).max(44),
  }),
);

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function displayName(name: string): string {
  return name
    .split("-")
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ");
}

loadLocalEnvironment();

const projectId = argument("--project");
if (projectId === undefined) {
  throw new Error(
    "Usage: pnpm seed:demo-fleet -- --project <WORKSPACE_PROJECT_ID>",
  );
}

const databaseUrl =
  process.env.SUPABASE_DATABASE_URL ?? process.env.DATABASE_URL;
const rpcUrl =
  process.env.SOLANA_DEVNET_RPC_HTTP_URL ?? process.env.SOLANA_RPC_HTTP_URL;
if (databaseUrl === undefined)
  throw new Error("Database URL is not configured");
if (rpcUrl === undefined) throw new Error("Devnet RPC URL is not configured");

const fixtureUrl = new URL(
  "../../../programs-demo/programs.json",
  import.meta.url,
);
const fixtures = fixtureSchema.parse(
  JSON.parse(await readFile(fixtureUrl, "utf8")),
);
const database = createPostgresStore(databaseUrl);
const ingestion = new ProgramIngestionService(
  new SolanaRpcClient(rpcUrl),
  database.store,
);
const results: Array<{
  readonly address: string;
  readonly baseline: "created" | "existing";
  readonly name: string;
  readonly verifiedFixture: boolean;
}> = [];

try {
  for (const fixture of fixtures) {
    const result = await ingestion.ingest({
      address: fixture.address,
      cluster: "devnet",
      organizationId: projectId,
    });
    await database.store.setOrganizationMonitorName(
      projectId,
      result.program.id,
      displayName(fixture.name),
    );
    const executableHash = result.snapshot.executableHash.replace(
      /^sha256:/,
      "",
    );
    results.push({
      address: fixture.address,
      baseline: result.createdBaseline ? "created" : "existing",
      name: fixture.name,
      verifiedFixture:
        result.program.programDataAddress === fixture.programDataAddress &&
        result.snapshot.deploymentSlot === BigInt(fixture.deploymentSlot) &&
        executableHash === fixture.executableHash,
    });
    console.log(
      JSON.stringify({
        event: "demo_fleet.program_registered",
        ...results.at(-1),
      }),
    );
  }
} finally {
  await database.close();
}

const mismatches = results.filter((result) => !result.verifiedFixture);
console.log(
  JSON.stringify({
    event: "demo_fleet.completed",
    fixtureMatches: results.length - mismatches.length,
    fixtureMismatches: mismatches.length,
    registered: results.length,
    workspace: projectId,
  }),
);

if (mismatches.length > 0) {
  throw new Error(
    `Fixture evidence changed for: ${mismatches.map(({ name }) => name).join(", ")}`,
  );
}
