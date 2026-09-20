import { diffSnapshots } from "./diff.js";
import type {
  InstructionSchemaChange,
  SecurityEvent,
  Severity,
  VersionSnapshot,
} from "./domain.js";

const severityOrder: Readonly<Record<Severity, number>> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1,
};

function highestSeverity(events: readonly SecurityEvent[]): Severity | null {
  return events.reduce<Severity | null>(
    (highest, event) =>
      highest === null || severityOrder[event.severity] > severityOrder[highest]
        ? event.severity
        : highest,
    null,
  );
}

function formatSchemaChange(
  change: InstructionSchemaChange,
): readonly string[] {
  const lines = [`${change.name} changes:`];
  for (const account of change.signerChanges) {
    lines.push(
      `- ${account.account} ${account.previous ? "required" : "did not require"} signer`,
      `+ ${account.account} ${account.current ? "requires" : "does not require"} signer`,
    );
  }
  for (const account of change.writableChanges) {
    lines.push(
      `- ${account.account} was ${account.previous ? "writable" : "readonly"}`,
      `+ ${account.account} is ${account.current ? "writable" : "readonly"}`,
    );
  }
  for (const account of change.accountsAdded) {
    lines.push(`+ account ${account.name} added`);
  }
  for (const account of change.accountsRemoved) {
    lines.push(`- account ${account.name} removed`);
  }
  if (change.argumentsChanged) lines.push("~ argument schema changed");
  return lines;
}

export function formatProgramDiffReport(input: {
  readonly current: VersionSnapshot;
  readonly events: readonly SecurityEvent[];
  readonly previous: VersionSnapshot;
}): string {
  const diff = diffSnapshots(input.previous, input.current);
  const instructionLines = [
    ...diff.instructionsAdded.map((name) => `+ ${name}`),
    ...diff.instructionsRemoved.map((name) => `- ${name}`),
    ...diff.idlChanges.instructionSchemasChanged.map(
      (instruction) => `~ ${instruction.name}`,
    ),
  ];
  const addedDetails =
    input.current.idl?.instructions
      .filter((instruction) =>
        diff.instructionsAdded.includes(instruction.name),
      )
      .flatMap((instruction) => {
        const signers = instruction.accounts
          .filter((account) => account.signer)
          .map((account) => account.name);
        const writable = instruction.accounts
          .filter((account) => account.writable)
          .map((account) => account.name);
        return [
          `${instruction.name}:`,
          ...(signers.length === 0
            ? []
            : [`+ requires signer: ${signers.join(", ")}`]),
          ...(writable.length === 0
            ? []
            : [`+ writes to: ${writable.join(", ")}`]),
        ];
      }) ?? [];
  const sourceLines =
    input.current.sourceRepositoryUrl === null
      ? ["unavailable"]
      : [
          "repository available",
          `repository: ${input.current.sourceRepositoryUrl}`,
          `previous revision: ${input.previous.sourceRevision ?? "unknown"}`,
          `current revision: ${input.current.sourceRevision ?? "unknown"}`,
          `verification: ${input.current.sourceVerificationStatus.toUpperCase()}`,
        ];
  const severity = highestSeverity(input.events);

  return [
    "USEKRATOSE PROGRAM DIFF",
    "",
    "Program:",
    input.current.programAddress,
    "",
    "Executable:",
    diff.executableChanged ? "CHANGED" : "UNCHANGED",
    "",
    "IDL:",
    input.current.idlHash === null
      ? "UNAVAILABLE"
      : diff.idlChanged
        ? "CHANGED"
        : "UNCHANGED",
    "",
    "Instructions:",
    ...(instructionLines.length === 0 ? ["no changes"] : instructionLines),
    ...(diff.idlChanges.instructionSchemasChanged.length === 0
      ? []
      : [
          "",
          ...diff.idlChanges.instructionSchemasChanged.flatMap(
            formatSchemaChange,
          ),
        ]),
    ...(addedDetails.length === 0 ? [] : ["", ...addedDetails]),
    "",
    "Account types:",
    diff.idlChanges.accountTypesChanged.length === 0
      ? "no changes"
      : diff.idlChanges.accountTypesChanged
          .map((change) => change.name)
          .join(", "),
    "",
    "Errors:",
    diff.idlChanges.errorsChanged.length === 0
      ? "no changes"
      : diff.idlChanges.errorsChanged.map((change) => change.name).join(", "),
    "",
    "Source:",
    ...sourceLines,
    "",
    "Previous verification:",
    input.current.verificationStatus.toUpperCase(),
    "",
    "Severity:",
    severity?.toUpperCase() ?? "NONE",
  ].join("\n");
}
