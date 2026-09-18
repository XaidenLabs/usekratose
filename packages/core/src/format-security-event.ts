import { diffSnapshots } from "./diff.js";
import type {
  SecurityEvent,
  SnapshotCandidate,
  VersionSnapshot,
} from "./domain.js";

function marker(
  changed: boolean,
  changedText: string,
  unchangedText: string,
): string {
  return `${changed ? "✓" : "✗"} ${changed ? changedText : unchangedText}`;
}

export function formatSecurityEvent(input: {
  readonly current: SnapshotCandidate;
  readonly event: SecurityEvent;
  readonly previous: VersionSnapshot;
}): string {
  const { current, event, previous } = input;
  const diff = diffSnapshots(previous, current);
  const changes = [
    marker(
      diff.executableChanged,
      "executable changed",
      "executable unchanged",
    ),
    marker(
      diff.deploymentSlotChanged,
      "deployment slot changed",
      "deployment slot unchanged",
    ),
    marker(
      diff.upgradeAuthorityChanged,
      "upgrade authority changed",
      "upgrade authority unchanged",
    ),
  ];
  if (diff.ownerChanged) changes.push("✓ program owner changed");
  if (diff.programDataChanged) changes.push("✓ ProgramData account changed");
  if (diff.idlChanged) changes.push("✓ IDL hash changed");
  if (diff.instructionsAdded.length > 0) {
    changes.push(`✓ instructions added: ${diff.instructionsAdded.join(", ")}`);
  }
  if (diff.instructionsRemoved.length > 0) {
    changes.push(
      `✓ instructions removed: ${diff.instructionsRemoved.join(", ")}`,
    );
  }
  if (diff.metadataChanged) changes.push("✓ metadata changed");
  if (diff.sourceReferenceChanged) changes.push("✓ source reference changed");

  return [
    "USEKRATOSE SECURITY EVENT",
    "",
    "Program:",
    current.programAddress,
    "",
    "Event:",
    event.type,
    "",
    "Previous deployment:",
    `slot ${previous.deploymentSlot.toLocaleString("en-US")}`,
    `hash ${previous.executableHash}`,
    `authority ${previous.upgradeAuthority ?? "IMMUTABLE"}`,
    "",
    "Current deployment:",
    `slot ${current.deploymentSlot.toLocaleString("en-US")}`,
    `hash ${current.executableHash}`,
    `authority ${current.upgradeAuthority ?? "IMMUTABLE"}`,
    "",
    "Changes:",
    ...changes,
    "",
    "Verification:",
    current.verificationStatus.toUpperCase(),
    "",
    "Severity:",
    event.severity.toUpperCase(),
  ].join("\n");
}

export function formatSecurityEventReport(input: {
  readonly current: VersionSnapshot;
  readonly events: readonly SecurityEvent[];
  readonly previous: VersionSnapshot;
}): string {
  if (input.events.length === 0) {
    return [
      "USEKRATOSE SECURITY EVENT",
      "",
      "Program:",
      input.current.programAddress,
      "",
      "Event:",
      "NONE",
      "",
      "No rule-generated security event exists for this snapshot pair.",
    ].join("\n");
  }

  return input.events
    .map((event) =>
      formatSecurityEvent({
        current: input.current,
        event,
        previous: input.previous,
      }),
    )
    .join("\n\n---\n\n");
}
