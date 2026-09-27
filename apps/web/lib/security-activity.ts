import { diffSnapshots, type SecurityEvent } from "@usekratose/core";
import type { RecentPublicSecurityActivity } from "@usekratose/database";

export function short(value: string | null, front = 12, back = 8): string {
  if (value === null) return "Unavailable";
  return value.length > front + back
    ? `${value.slice(0, front)}…${value.slice(-back)}`
    : value;
}

export function activityFacts(activity: RecentPublicSecurityActivity) {
  const diff = diffSnapshots(
    activity.previousSnapshot,
    activity.currentSnapshot,
  );
  return [
    {
      label: "Executable",
      state: diff.executableChanged ? "changed" : "unchanged",
      value: short(activity.currentSnapshot.executableHash, 15, 10),
    },
    {
      label: "Deployment",
      state: diff.deploymentSlotChanged ? "changed" : "unchanged",
      value: `slot ${activity.currentSnapshot.deploymentSlot.toLocaleString()}`,
    },
    {
      label: "Authority",
      state: diff.upgradeAuthorityChanged ? "changed" : "unchanged",
      value:
        activity.currentSnapshot.upgradeAuthority === null
          ? "IMMUTABLE"
          : short(activity.currentSnapshot.upgradeAuthority),
    },
    {
      label: "Verification",
      state: activity.currentSnapshot.verificationStatus,
      value: activity.currentSnapshot.verificationStatus.toUpperCase(),
    },
  ] as const;
}

export function eventEvidenceValue(
  activity: RecentPublicSecurityActivity,
): string {
  const { currentSnapshot, event, previousSnapshot } = activity;
  switch (event.type) {
    case "AUTHORITY_CHANGED":
    case "PROGRAM_BECAME_IMMUTABLE":
      return `${short(previousSnapshot.upgradeAuthority)} → ${short(currentSnapshot.upgradeAuthority)}`;
    case "OWNER_CHANGED":
      return `${short(previousSnapshot.programOwner)} → ${short(currentSnapshot.programOwner)}`;
    case "IDL_CHANGED":
    case "INSTRUCTION_ADDED":
    case "INSTRUCTION_CHANGED":
    case "INSTRUCTION_REMOVED":
      return short(currentSnapshot.idlHash);
    case "VERIFICATION_STALE":
      return currentSnapshot.verificationStatus.toUpperCase();
    case "PROGRAM_UPGRADED":
      return short(currentSnapshot.executableHash, 15, 10);
  }
}

export function eventLabel(event: SecurityEvent): string {
  return event.type.replaceAll("_", " ");
}
